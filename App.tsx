
import React, { useState, useEffect } from 'react';
import { Article, GenerationProgress, TargetLength } from './types';
import { gemini } from './geminiService';
import { db } from './db';
import ArticleList from './components/ArticleList';
import ArticleCreator from './components/ArticleCreator';
import ArticleViewer from './components/ArticleViewer';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'create' | 'view' | 'schedule'>('home');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<(GenerationProgress & { current: number, total: number }) | null>(null);

  // 初回読み込み
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const saved = await db.getAll();
      setArticles(saved);
    } catch (e) {
      console.error("DB Load Error:", e);
    }
  };

  const handleGenerateBulk = async (trends: string[], refs: string[], startAt: string, intervalDays: number, targetLength: TargetLength) => {
    const keyOk = await gemini.checkApiKey();
    if (!keyOk) { 
      await gemini.openKeySelector(); 
      return; 
    }

    setIsGenerating(true);
    let startDate = new Date(startAt);

    try {
      for (let i = 0; i < trends.length; i++) {
        const trend = trends[i];
        const currentScheduledAt = new Date(startDate);
        currentScheduledAt.setDate(startDate.getDate() + (i * intervalDays));

        // 進捗更新
        setProgress({ 
          step: 'searching', 
          message: `[${i + 1}/${trends.length}] 「${trend}」の構成を練っています...`, 
          percent: 5, 
          current: i + 1, 
          total: trends.length 
        });

        // 1. 構成案作成
        const outlineData = await gemini.searchAndOutline(trend, targetLength, refs);
        let fullContent = '';
        const sectionImages: any[] = [];
        const totalSections = outlineData.outline.length;

        // 2. セクション執筆
        for (let j = 0; j < totalSections; j++) {
          const section = outlineData.outline[j];
          setProgress(p => p ? { 
            ...p, 
            step: 'writing', 
            message: `[${i + 1}/${trends.length}] 章 ${j + 1}/${totalSections} を執筆中...`, 
            percent: 10 + Math.floor((j / totalSections) * 70) 
          } : null);

          let content = await gemini.generateSectionContent(outlineData.title, section, outlineData.youtubeUrls);

          // 画像タグの置換
          const imgMatch = content.match(/\[IMAGE: (.*?)\]/);
          if (imgMatch) {
            const description = imgMatch[1];
            setProgress(p => p ? { ...p, step: 'imaging', message: `章 ${j + 1} の挿絵を生成中...` } : null);
            const imgUrl = await gemini.generateSectionImage(description);
            const imgId = `img_${Date.now()}_${i}_${j}`;
            sectionImages.push({ id: imgId, url: imgUrl, description, sectionIndex: j });
            content = content.replace(imgMatch[0], `[REAL_IMAGE:${imgId}]`);
          }

          fullContent += `## ${section.heading}\n\n${content}\n\n`;
        }

        // 3. サムネイル生成
        setProgress(p => p ? { ...p, step: 'imaging', message: `メインサムネイルを生成中...`, percent: 95 } : null);
        const thumbUrl = await gemini.generateThumbnail(outlineData.title);

        // 4. 保存
        const newArticle: Article = {
          id: Date.now().toString() + i,
          trend,
          title: outlineData.title,
          content: fullContent,
          thumbnailUrl: thumbUrl,
          sectionImages,
          createdAt: new Date().toISOString(),
          scheduledAt: currentScheduledAt.toISOString(),
          status: 'scheduled',
          references: refs,
          targetLength,
          youtubeUrls: outlineData.youtubeUrls
        };

        await db.save(newArticle);
        // 各記事生成の度にメモリ上のリストも更新（クラッシュ対策）
        setArticles(prev => [newArticle, ...prev]);
      }
      
      setIsGenerating(false);
      setProgress(null);
      setView('home');
      loadArticles(); // 最終同期
    } catch (e: any) {
      console.error("Generation Error:", e);
      alert("生成中にエラーが発生しました: " + e.message);
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('この記事をライブラリから完全に削除しますか？')) return;
    await db.delete(id);
    setArticles(prev => prev.filter(a => a.id !== id));
    setView('home');
  };

  const updateArticle = async (updated: Article) => {
    await db.save(updated);
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedArticle(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc]">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 px-4 h-16">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-full">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-xl group-hover:rotate-6 transition-transform">N</div>
            <h1 className="text-xl font-black text-gray-900 tracking-tighter">Note Master AI</h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('schedule')} className="text-sm font-bold text-gray-500 hover:text-black transition-colors">予約一覧</button>
            <button onClick={() => setView('create')} className="bg-black text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">一括予約作成</button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-10">
        {isGenerating && progress && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-white">
            <div className="max-w-md w-full text-center">
              <div className="w-24 h-24 bg-white/10 rounded-3xl mx-auto mb-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-green-500/20 animate-pulse"></div>
                <i className="fa-solid fa-wand-magic-sparkles text-4xl text-green-400 animate-bounce"></i>
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">{progress.message}</h3>
              <p className="text-sm font-bold text-gray-400 mb-10 uppercase tracking-[0.2em]">{progress.current} / {progress.total} Articles Generating...</p>
              
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <div style={{ width: `${progress.percent}%` }} className="h-full bg-green-500 transition-all duration-500 ease-out" />
              </div>
              <p className="text-[10px] text-gray-500 font-bold">ブラウザを閉じずにそのままお待ちください</p>
            </div>
          </div>
        )}

        {view === 'home' && (
          <div className="space-y-16 animate-fade-in">
            <section className="bg-white rounded-[3rem] p-10 md:p-20 border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-green-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 leading-[1.1]">
                  あなたの知性を、<br />
                  <span className="text-green-600">一万文字の芸術</span>に。
                </h2>
                <p className="text-gray-500 text-lg mb-12 font-medium leading-relaxed">
                  トレンドから深い洞察を引き出し、高品質な画像と共にnoteへ。<br />
                  AIが24時間、あなたの代わりに書き続けます。
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setView('create')} className="bg-black text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-gray-800 transition-all">
                    新規作成を開始
                  </button>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-black text-gray-900">ライブラリ</h3>
                  <p className="text-gray-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Your Published & Draft Articles</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-gray-900">{articles.length}</span>
                  <span className="text-sm font-bold text-gray-400 ml-2">FILES</span>
                </div>
              </div>

              {articles.length > 0 ? (
                <ArticleList articles={articles} onSelect={(a) => { setSelectedArticle(a); setView('view'); }} />
              ) : (
                <div className="text-center py-40 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                  <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-6"></i>
                  <p className="text-gray-400 font-bold">まだ記事がありません。右上のボタンから作成しましょう。</p>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'create' && <ArticleCreator onGenerateBulk={handleGenerateBulk} onCancel={() => setView('home')} />}
        {view === 'view' && selectedArticle && (
          <ArticleViewer 
            article={selectedArticle} 
            onBack={() => setView('home')} 
            onDelete={() => deleteArticle(selectedArticle.id)} 
            onUpdate={updateArticle} 
          />
        )}
        {view === 'schedule' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="flex items-center gap-4 mb-10">
               <button onClick={() => setView('home')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"><i className="fa-solid fa-chevron-left"></i></button>
               <h2 className="text-3xl font-black">投稿スケジュール</h2>
             </div>
             <div className="grid gap-6">
               {articles.filter(a => a.status === 'scheduled').length > 0 ? (
                 articles.filter(a => a.status === 'scheduled').map(a => (
                   <div key={a.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-8">
                       <div className="relative">
                         <img src={a.thumbnailUrl} className="w-24 h-24 rounded-2xl object-cover" />
                         <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs">
                           <i className="fa-solid fa-clock"></i>
                         </div>
                       </div>
                       <div>
                         <h4 className="font-black text-xl mb-2">{a.title}</h4>
                         <div className="flex items-center gap-4">
                           <span className="text-xs font-black bg-green-50 text-green-600 px-3 py-1 rounded-lg">
                             {new Date(a.scheduledAt!).toLocaleDateString('ja-JP')} {new Date(a.scheduledAt!).toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'})}
                           </span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{a.targetLength} CHARS</span>
                         </div>
                       </div>
                     </div>
                     <button onClick={() => { setSelectedArticle(a); setView('view'); }} className="bg-gray-50 hover:bg-black hover:text-white px-8 py-3 rounded-xl font-black transition-all">内容を確認</button>
                   </div>
                 ))
               ) : (
                 <p className="text-center py-20 text-gray-400 font-bold bg-white rounded-[2rem] border border-gray-100">現在、予約されている記事はありません。</p>
               )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
