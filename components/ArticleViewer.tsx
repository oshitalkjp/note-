
import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { gemini } from '../geminiService';

interface ArticleViewerProps {
  article: Article;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

const ArticleViewer: React.FC<ArticleViewerProps> = ({ article, onBack, onDelete, onUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'assets'>('preview');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<'none' | 'note' | 'patreon'>('none');
  const [engData, setEngData] = useState<{ title: string; content: string; thumb: string } | null>(null);

  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const directCopy = async (text: string, label: string) => {
    if (!text) {
      setCopyStatus("コピーする内容がありません。");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label}をコピーしました！`);
    } catch (err) {
      setCopyStatus("コピーに失敗しました。画面をクリックしてから再度試してください。");
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startNotePublish = () => {
    setAssistantMode('note');
    downloadImage(article.thumbnailUrl, 'note_cover.png');
    article.sectionImages?.forEach((img, idx) => {
      downloadImage(img.url, `image_${idx + 1}.png`);
    });
  };

  const startPatreonPublish = async () => {
    setIsProcessing(true);
    setCopyStatus("【超重要】英文とサムネイルを生成中... 閉じずに待ってください。");
    try {
      // 1. 英語タイトル
      const engTitle = await gemini.translateToEnglish(article.title || '');
      // 2. 英語本文
      const engBody = await gemini.translateToEnglish(article.content || '');
      // 3. 英語タイトル入りの新しいサムネイル
      const engThumb = await gemini.generateThumbnail(engTitle);
      
      setEngData({ title: engTitle, content: engBody, thumb: engThumb });
      setAssistantMode('patreon');
      downloadImage(engThumb, 'patreon_cover.png');
      setCopyStatus("英文の準備が整いました！");
    } catch (e: any) {
      setCopyStatus("生成失敗: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFormattedBody = (content: string, isPatreon = false) => {
    let body = content;
    body = body.replace(/\[REAL_IMAGE:(.*?)\]/g, (match, id) => {
      const idx = article.sectionImages?.findIndex(i => i.id === id);
      const label = isPatreon ? "Insert Image" : "画像をアップロード";
      return `\n\n【${label}: ${idx !== undefined ? idx + 1 : 0}枚目】\n\n`;
    });
    body = body.replace(/\[YouTubeリンク: (.*?)\]/g, (match, url) => `\n\n${url}\n\n`);
    return body;
  };

  return (
    <div className="max-w-6xl mx-auto pb-40">
      {/* 操作バー */}
      <div className="bg-white/90 backdrop-blur-xl border border-gray-100 p-6 rounded-[2.5rem] mb-8 shadow-xl flex items-center justify-between sticky top-20 z-40">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('preview')} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${activeTab === 'preview' ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>記事をみる</button>
          <button onClick={() => setActiveTab('assets')} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${activeTab === 'assets' ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>URLリスト</button>
        </div>
        <div className="flex gap-3">
          <button disabled={isProcessing} onClick={startNotePublish} className="bg-[#2cb696] text-white px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-lg shadow-green-100">note投稿</button>
          <button disabled={isProcessing} onClick={startPatreonPublish} className="bg-[#ff424d] text-white px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-lg shadow-red-100">
            {isProcessing ? <i className="fa-solid fa-sync animate-spin mr-2"></i> : null}
            Patreon (英文に変換)
          </button>
        </div>
      </div>

      {/* 通知トースト */}
      {copyStatus && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-black text-white px-10 py-5 rounded-3xl font-black text-sm shadow-2xl flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
          {copyStatus}
        </div>
      )}

      {/* 投稿アシスタントUI */}
      {assistantMode !== 'none' && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl p-12 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${assistantMode === 'note' ? 'bg-[#2cb696]' : 'bg-[#ff424d]'}`}></div>
            <button onClick={() => setAssistantMode('none')} className="absolute top-10 right-10 text-gray-300 hover:text-black"><i className="fa-solid fa-times text-2xl"></i></button>
            
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-black mb-2">{assistantMode === 'note' ? 'note' : 'Patreon'} Ready!</h2>
              <p className="text-gray-400 font-bold">画像はPCに保存されました。以下の順でコピーしてください。</p>
            </div>

            <div className="grid gap-6">
              <button 
                onClick={() => directCopy(assistantMode === 'note' ? article.title : (engData?.title || ''), "タイトル")}
                className="group w-full bg-gray-50 hover:bg-gray-100 p-8 rounded-[2rem] flex items-center justify-between transition-all border border-transparent hover:border-gray-200"
              >
                <div className="text-left">
                  <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">Step 1</span>
                  <p className="font-black text-xl">タイトルをコピー</p>
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-[300px]">{assistantMode === 'note' ? article.title : engData?.title}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                  <i className="fa-solid fa-copy"></i>
                </div>
              </button>

              <button 
                onClick={() => directCopy(getFormattedBody(assistantMode === 'note' ? article.content : (engData?.content || ''), assistantMode === 'patreon'), "本文")}
                className="group w-full bg-gray-50 hover:bg-gray-100 p-8 rounded-[2rem] flex items-center justify-between transition-all border border-transparent hover:border-gray-200"
              >
                <div className="text-left">
                  <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">Step 2</span>
                  <p className="font-black text-xl">{assistantMode === 'note' ? '本文' : 'English Body'} をコピー</p>
                  <p className="text-xs text-gray-400 mt-1">画像挿入タグが自動で調整されています</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                  <i className="fa-solid fa-align-left"></i>
                </div>
              </button>

              <button 
                onClick={() => window.open(assistantMode === 'note' ? 'https://note.com/notes/new' : 'https://www.patreon.com/posts/new', '_blank')}
                className="w-full bg-black text-white p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-xl mt-4 hover:scale-[1.02] transition-all shadow-2xl"
              >
                {assistantMode === 'note' ? 'note' : 'Patreon'} を開く <i className="fa-solid fa-external-link"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preview' ? (
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-sm border border-gray-100 animate-fade-in">
          <div className="aspect-video relative">
            <img src={article.thumbnailUrl} className="w-full h-full object-cover" alt="Main" />
          </div>
          <div className="p-12 md:p-24">
            <h1 className="text-5xl md:text-8xl font-black text-gray-900 mb-16 leading-tight tracking-tighter">{article.title}</h1>
            <div className="prose prose-2xl max-w-none text-gray-700 leading-relaxed font-medium">
              {(article.content || '').split('\n').map((para, i) => {
                if (para.startsWith('## ')) return <h2 key={i} className="text-4xl font-black text-black mt-24 mb-10 flex items-center gap-4"><span className="w-2 h-10 bg-green-500 rounded-full"></span>{para.replace('## ', '')}</h2>;
                if (para.includes('[REAL_IMAGE:')) {
                  const imgId = para.match(/\[REAL_IMAGE:(.*?)\]/)?.[1];
                  const img = article.sectionImages?.find(si => si.id === imgId);
                  return img ? <div key={i} className="my-20"><img src={img.url} className="rounded-[3rem] w-full shadow-2xl border border-gray-50" /></div> : null;
                }
                if (para.includes('[YouTubeリンク:')) {
                  const url = para.match(/\[YouTubeリンク: (.*?)\]/)?.[1];
                  if (!url) return null;
                  const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
                  return (
                    <div key={i} className="my-20 p-1 bg-black rounded-[3.5rem] overflow-hidden shadow-2xl">
                      <div className="aspect-video">
                        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allowFullScreen></iframe>
                      </div>
                      <div className="p-4 text-center text-[10px] font-black text-white/40 uppercase tracking-widest">{url}</div>
                    </div>
                  );
                }
                return para.trim() ? <p key={i} className="mb-8">{para}</p> : <br key={i} />;
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-xl">
            <h3 className="font-black text-2xl mb-8">アセットURLリスト</h3>
            <div className="grid gap-4">
              <div className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase">Cover Image</span>
                <button onClick={() => directCopy(article.thumbnailUrl, "サムネイルURL")} className="bg-black text-white px-6 py-2 rounded-xl text-xs font-black">Copy URL</button>
              </div>
              {article.youtubeUrls?.map((url, i) => (
                <div key={i} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase">YouTube Link</span>
                  <button onClick={() => directCopy(url, "YouTube URL")} className="bg-black text-white px-6 py-2 rounded-xl text-xs font-black">Copy URL</button>
                </div>
              ))}
              {article.sectionImages?.map((img, i) => (
                <div key={i} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Section Image {i+1}</span>
                  <button onClick={() => directCopy(img.url, `画像${i+1} URL`)} className="bg-black text-white px-6 py-2 rounded-xl text-xs font-black">Copy URL</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 flex justify-between items-center px-10">
        <button onClick={onBack} className="text-gray-400 font-bold hover:text-black transition-all">← 一覧に戻る</button>
        <button onClick={onDelete} className="bg-red-50 text-red-500 px-6 py-3 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all">この記事を削除</button>
      </div>
    </div>
  );
};

export default ArticleViewer;
