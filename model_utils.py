
import re, numpy as np, nltk, phonetics, librosa
from collections import Counter
from nltk import word_tokenize
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)

COMMON_CLICHES = set(['tears','demons','pain','heartbreak','alone','hate','love','sleep','money','haters','lost','cry'])

def clean_text(s): return re.sub(r"[^\\w\\s'\\-\\n]", '', s.strip())

def get_rhyme_group(w):
    try: return phonetics.metaphone(w.lower())
    except: return w.lower()

def rhyme_diversity(lines):
    ends=[get_rhyme_group(l.split()[-1]) for l in lines if l.split()]
    return len(set(ends))/len(ends) if ends else 0

def lexical_novelty(t):
    toks=word_tokenize(t.lower()); freq=Counter(toks)
    hap=[t for t,c in freq.items() if c==1]
    return len(hap)/(len(toks)+1)

def cliche_density(t):
    toks=t.lower().split()
    hits=sum(toks.count(c) for c in COMMON_CLICHES)
    return hits/(len(toks)+1)

def sentiment_flatness(lines):
    pos={'love','bright','good','win'}; neg={'hate','lost','sad','pain','alone'}
    vals=[len(set(L.lower().split())&pos)-len(set(L.lower().split())&neg) for L in lines]
    return np.var(vals)/(np.var(vals)+1) if vals else 1.0

def analyze_lyrics_text(text):
    text=clean_text(text); lines=[l for l in text.split('\\n') if l.strip()]
    feats={}
    feats['rhyme_diversity']=rhyme_diversity(lines)
    feats['lexical_novelty']=lexical_novelty(text)
    feats['cliche_density']=cliche_density(text)
    feats['sentiment_flatness']=sentiment_flatness(lines)
    feats['line_len_var']=np.var([len(l.split()) for l in lines]) if lines else 0
    score=0; reasons=[]
    if feats['rhyme_diversity']<0.5: score+=0.3; reasons.append('Low rhyme diversity')
    if feats['lexical_novelty']<0.15: score+=0.3; reasons.append('Low lexical novelty')
    if feats['cliche_density']>0.02: score+=0.2; reasons.append('Cliche heavy')
    if feats['line_len_var']<2.0: score+=0.2; reasons.append('Line length too tidy')
    if feats['sentiment_flatness']<0.1: score+=0.2; reasons.append('Flat sentiment')
    return feats, min(1,score), reasons

def transcribe_audio(path):
    try:
        import whisper
        m=whisper.load_model('tiny')
        res=m.transcribe(path)
        return res.get('text','')
    except Exception as e:
        print('Transcription failed:',e)
        return ''

def extract_audio_features(path):
    try:
        y,sr=librosa.load(path, sr=22050, mono=True)
        tempo,_=librosa.beat.beat_track(y=y,sr=sr)
        pitches,mags=librosa.piptrack(y=y,sr=sr)
        thresh=np.median(mags)
        vals=pitches[mags>thresh]
        pv=float(np.var(vals)) if vals.size>0 else 0
        flat=float(np.mean(librosa.feature.spectral_flatness(y=y)))
        return {'tempo':float(tempo),'pitch_var':pv,'flatness':flat}
    except Exception as e:
        print('Audio feature extraction failed:',e)
        return None
