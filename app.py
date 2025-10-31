
from flask import Flask,request,render_template,jsonify
import os,pickle,numpy as np
from model_utils import analyze_lyrics_text,transcribe_audio,extract_audio_features

app=Flask(__name__)
os.makedirs('uploads',exist_ok=True)
@app.route('/')
def index(): return render_template('index.html')

@app.route('/analyze',methods=['POST'])
def analyze():
    text=request.form.get('lyrics_text','').strip()
    f=request.files.get('audio_file')
    af=None
    if f and f.filename:
        path=os.path.join('uploads',f.filename)
        f.save(path)
        text=transcribe_audio(path)
        af=extract_audio_features(path)
    if not text: return jsonify({'error':'No lyrics or audio'}),400
    feats,score,why=analyze_lyrics_text(text)
    return jsonify({'heuristic_score':round(score,3),'features':feats,'reasons':why,'lyrics':text,'audio_features':af})

if __name__=='__main__':
    app.run(host='0.0.0.0',port=3000)
