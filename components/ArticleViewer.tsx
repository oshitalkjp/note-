
import React from 'react';
import { Article } from '../types';

interface ArticleViewerProps {
  article: Article;
  onBack: () => void;
}

const ArticleViewer: React.FC<ArticleViewerProps> = ({ article, onBack }) => {
  const copyToClipboard = () => {
    const text = `# ${article.title}\n\n${article.content}`;
    navigator.clipboard.writeText(text);
    alert('記事全文をMarkdown形式でコピーしました。note.comに貼り付けてください。');
  };

  const downloadThumbnail = () => {
    const link = document.createElement('a');
    link.href = article.thumbnailUrl;
    link.download = `thumbnail-${article.id}.png`;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tool bar */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium"
        >
          <i className="fa-solid fa-arrow-left"></i> 一覧に戻る
        </button>
        <div className="flex gap-3">
          <button 
            onClick={downloadThumbnail}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-download"></i> サムネ保存
          </button>
          <button 
            onClick={copyToClipboard}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100"
          >
            <i className="fa-solid fa-copy"></i> 全文コピー
          </button>
        </div>
      </div>

      {/* Article Content */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        {/* Main Header Image */}
        <div className="w-full aspect-video relative">
          {article.thumbnailUrl ? (
            <img 
              src={article.thumbnailUrl} 
              alt="Thumbnail" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
              No Image Generated
            </div>
          )}
        </div>

        <div className="p-8 md:p-12 lg:p-16">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <i className="fa-regular fa-calendar"></i> {new Date(article.createdAt).toLocaleDateString('ja-JP')}
              </span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                AI 深掘り記事
              </span>
            </div>
          </div>

          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed space-y-8">
            {article.content.split('\n').map((para, idx) => {
              // Simple Markdown rendering logic
              if (para.startsWith('## ')) {
                return <h2 key={idx} className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mt-12 mb-6">{para.replace('## ', '')}</h2>;
              }
              if (para.startsWith('### ')) {
                return <h3 key={idx} className="text-xl font-bold text-gray-900 mt-8 mb-4">{para.replace('### ', '')}</h3>;
              }
              if (para.startsWith('- ')) {
                return <li key={idx} className="ml-4 list-disc text-gray-700 mb-2">{para.replace('- ', '')}</li>;
              }
              if (para.includes('[YouTube引用:')) {
                const query = para.match(/\[YouTube引用: (.*?)\]/)?.[1] || 'video';
                return (
                  <div key={idx} className="bg-red-50 border border-red-100 rounded-xl p-6 my-8 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1 block">YouTube Suggestion</span>
                      <p className="text-gray-900 font-bold">ここに「{query}」に関する動画を埋め込んでください</p>
                    </div>
                    <i className="fa-brands fa-youtube text-4xl text-red-600"></i>
                  </div>
                );
              }
              
              // Handle section images if any
              const sectionImg = article.sectionImages.find(img => {
                // Approximate section matching
                return idx > 0 && para.includes('## '); 
              });

              if (para.trim() === '') return <br key={idx} />;
              
              return <p key={idx} className="whitespace-pre-wrap">{para}</p>;
            })}
          </div>

          {/* Section Images Gallery (displayed separately at bottom or interleaved if complex enough) */}
          {article.sectionImages.length > 0 && (
            <div className="mt-16 pt-16 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">生成された挿絵ライブラリ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {article.sectionImages.map(img => (
                  <div key={img.id} className="space-y-2">
                    <img src={img.url} className="w-full rounded-xl shadow-md" alt={img.description} />
                    <p className="text-xs text-gray-400 italic text-center">"{img.description}" の解説用画像</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-12 mb-20 text-center">
        <p className="text-gray-400 text-sm mb-6">この記事の内容が気に入りましたか？</p>
        <button 
          onClick={copyToClipboard}
          className="bg-green-600 text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-green-100 hover:scale-105 transition-all"
        >
          note.comにコピーして投稿する
        </button>
      </div>
    </div>
  );
};

export default ArticleViewer;
