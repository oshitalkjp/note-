
import React, { useState } from 'react';
import { Article } from '../types';
import { gemini } from '../geminiService';

interface ArticleViewerProps {
  article: Article;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (article: Article) => void;
}

const ArticleViewer: React.FC<ArticleViewerProps> = ({ article, onBack, onDelete, onUpdate }) => {
  const [isTranslating, setIsTranslating] = useState(false);

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    alert(`${label}をコピーしました！`);
  };

  const cleanContentForEditor = (content: string, lang: 'ja' | 'en' = 'ja') => {
    let text = content
      .replace(/\[REAL_IMAGE:.*?\]/g, '\n(Image here)\n')
      .replace(/\[YouTubeリンク: .*?\]/g, (match) => {
        const url = match.match(/\[YouTubeリンク: (.*?)\]/)?.[1];
        return url ? `\n${url}\n` : '';
      });
    return text.trim();
  };

  const handlePatreonPublish = async () => {
    setIsTranslating(true);
    try {
      const engTitle = await gemini.translateToEnglish(article.title);
      const engContent = await gemini.translateToEnglish(article.content);
      
      downloadImage(article.thumbnailUrl, 'patreon_cover.png');
      await copyToClipboard(engTitle, 'English Title');
      
      setTimeout(async () => {
        if (confirm('Next: Copy English Body Text?')) {
          await copyToClipboard(cleanContentForEditor(engContent, 'en'), 'English Body');
          window.open('https://www.patreon.com/posts/new', '_blank');
        }
      }, 500);
    } catch (e) {
      alert('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const getYouTubeEmbedId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-fade-in">
      {/* 投稿アシスタントパネル */}
      <div className="bg-black text-white p-8 rounded-[3rem] mb-12 shadow-2xl flex flex-wrap items-center justify-between gap-8 border-4 border-green-500/20">
        <div className="flex-grow">
          <h3 className="text-xl font-black mb-2 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            パブリッシング・アシスタント
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {isTranslating ? '英語翻訳中... お待ちください' : '各ボタンを順にクリックしてください'}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            disabled={isTranslating}
            onClick={() => {
              downloadImage(article.thumbnailUrl, 'note_thumbnail.png');
              copyToClipboard(article.title, 'タイトル');
              window.open('https://note.com/notes/new', '_blank');
            }}
            className="bg-green-600 hover:bg-green-500 px-6 py-4 rounded-2xl font-black text-xs transition-all shadow-lg disabled:opacity-50"
          >
            1. note投稿画面へ
          </button>
          <button 
            disabled={isTranslating}
            onClick={handlePatreonPublish}
            className="bg-[#ff424d] hover:bg-[#ff5a64] px-6 py-4 rounded-2xl font-black text-xs transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isTranslating ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-language"></i>}
            1. Patreonへ (英語翻訳)
          </button>
          <button 
            disabled={isTranslating}
            onClick={() => copyToClipboard(cleanContentForEditor(article.content), '本文')}
            className="bg-white text-black hover:bg-gray-100 px-6 py-4 rounded-2xl font-black text-xs transition-all shadow-lg disabled:opacity-50"
          >
            2. 本文をコピー
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[4rem] overflow-hidden shadow-sm border border-gray-100">
            {/* サムネイル（純粋に画像のみ。文字被りなし） */}
            <div className="relative group aspect-video bg-gray-100">
              <img src={article.thumbnailUrl} className="w-full h-full object-cover" alt="Article Thumbnail" />
              <button 
                onClick={() => downloadImage(article.thumbnailUrl, 'thumbnail.png')}
                className="absolute bottom-6 right-6 bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] opacity-0 group-hover:opacity-100 transition-all hover:bg-green-600"
              >
                <i className="fa-solid fa-download mr-2"></i>保存
              </button>
            </div>

            <div className="p-12 md:p-20">
              {/* タイトルを画像の下に配置 */}
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-16 leading-tight tracking-tighter">
                {article.title}
              </h1>

              <div className="prose prose-2xl max-w-none prose-headings:font-black prose-p:text-gray-600 prose-p:leading-relaxed prose-strong:text-black">
                {article.content.split('\n').map((para, idx) => {
                  if (para.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-4xl font-black mt-24 mb-10 flex items-center gap-6">
                        <span className="w-3 h-12 bg-green-500 rounded-full"></span>
                        {para.replace('## ', '')}
                      </h2>
                    );
                  }
                  
                  if (para.includes('[REAL_IMAGE:')) {
                    const imgId = para.match(/\[REAL_IMAGE:(.*?)\]/)?.[1];
                    const targetImg = article.sectionImages.find(i => i.id === imgId);
                    if (targetImg) {
                      return (
                        <figure key={idx} className="my-20 group relative">
                          <img src={targetImg.url} className="rounded-[3rem] shadow-2xl w-full border border-gray-100" />
                          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => downloadImage(targetImg.url, `img_${idx}.png`)}
                              className="bg-white text-black px-5 py-3 rounded-2xl font-black text-[10px] shadow-2xl hover:bg-green-500 hover:text-white"
                            >
                              <i className="fa-solid fa-download mr-2"></i>保存
                            </button>
                          </div>
                        </figure>
                      );
                    }
                  }

                  if (para.includes('[YouTubeリンク:')) {
                    const url = para.match(/\[YouTubeリンク: (.*?)\]/)?.[1];
                    const embedId = url ? getYouTubeEmbedId(url) : null;
                    if (!url) return null;
                    return (
                      <div key={idx} className="my-20">
                        {embedId ? (
                          <div className="rounded-[3rem] overflow-hidden shadow-2xl aspect-video border-4 border-black">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={`https://www.youtube.com/embed/${embedId}`} 
                              frameBorder="0" 
                              allowFullScreen
                            ></iframe>
                          </div>
                        ) : (
                          <a href={url} target="_blank" className="p-10 bg-red-50 rounded-[3rem] block text-center">
                            <i className="fa-brands fa-youtube text-5xl text-red-600 mb-2"></i>
                            <p className="font-black">{url}</p>
                          </a>
                        )}
                      </div>
                    );
                  }

                  if (para.trim() === '') return null;
                  return <p key={idx} className="mb-8">{para}</p>;
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-32 space-y-8">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
               <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Status</h4>
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-bold">文字数</span>
                   <span className="font-black">{article.content.length}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-bold">挿絵</span>
                   <span className="font-black">{article.sectionImages.length}</span>
                 </div>
               </div>
               <button 
                onClick={onDelete}
                className="w-full mt-10 py-5 bg-red-50 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all"
               >
                 削除
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleViewer;
