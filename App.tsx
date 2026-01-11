
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

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = async () => {
    try {
      const saved = await db.getAll();
      setArticles(saved || []);
    } catch (e) {
      console.error("DB Load Error", e);
    }
  };

  const handleGenerateBulk = async (trends: string[], refs: string[], startAt: string, intervalDays: number, targetLength: TargetLength) => {
    const hasKey = await gemini.checkApiKey();
    if (!hasKey) {
      await gemini.openKeySelector();
    }

    setIsGenerating(true);
    const startDate = new Date(startAt);

    try {
      for (let i = 0; i < trends.length; i++) {
        const trend = trends[i];
        const currentScheduledAt = new Date(startDate);
        currentScheduledAt.setDate(startDate.getDate() + (i * intervalDays));

        setProgress({ step: 'searching', message: `[${i + 1}/${trends.length}] 構成を練っています...`, percent: 5, current: i + 1, total: trends.length });
        
        const outlineData = await gemini.searchAndOutline(trend, targetLength, refs);
        const singleYoutubeUrl = outlineData.youtubeUrl || "";

        setProgress(p => p ? { ...p, step: 'writing', message: `1万文字の深掘り記事を執筆中...`, percent: 30 } : null);
        
        // 【画像枚数制限】
        // システムプロンプトに加え、コード側でも「奇数番目の章」でのみ画像生成を許可するように制限
        const sectionPromises = outlineData.outline.map(async (section: any, idx: number) => {
          const content = await gemini.generateSectionContent(outlineData.title, section, singleYoutubeUrl);
          const imgMatch = content.match(/\[IMAGE: (.*?)\]/);
          let finalContent = content;
          let imageData = null;

          // 画像生成は奇数インデックス（0, 2, 4... つまり2章に1回）に制限
          if (imgMatch && idx % 2 === 0) {
            const description = imgMatch[1];
            try {
              const imgUrl = await gemini.generateSectionImage(description);
              const imgId = `img_${Date.now()}_${idx}`;
              imageData = { id: imgId, url: imgUrl, description, sectionIndex: idx };
              finalContent = content.replace(imgMatch[0], `[REAL_IMAGE:${imgId}]`);
            } catch (err) {
              console.error("Image generation failed", err);
              finalContent = content.replace(imgMatch[0], "");
            }
          } else if (imgMatch) {
            // 画像生成対象外の章でタグが出てしまった場合は削除
            finalContent = content.replace(imgMatch[0], "");
          }
          return { finalContent, imageData, heading: section.heading };
        });

        const results = await Promise.all(sectionPromises);
        
        const fullContent = results.map(r => `## ${r.heading}\n\n${r.finalContent}`).join('\n\n');
        const sectionImages = results.map(r => r.imageData).filter(Boolean);

        setProgress(p => p ? { ...p, step: 'imaging', message: `メインサムネイルを生成中...`, percent: 90 } : null);
        const thumbUrl = await gemini.generateThumbnail(outlineData.title);

        const newArticle: Article = {
          id: Date.now().toString() + i,
          trend,
          title: outlineData.title,
          content: fullContent,
          thumbnailUrl: thumbUrl,
          sectionImages: sectionImages as any[],
          createdAt: new Date().toISOString(),
          scheduledAt: currentScheduledAt.toISOString(),
          status: 'scheduled',
          targetLength,
          youtubeUrls: singleYoutubeUrl ? [singleYoutubeUrl] : []
        };

        await db.save(newArticle);
        setArticles(prev => [newArticle, ...prev]);
      }
      setIsGenerating(false);
      setProgress(null);
      setView('home');
    } catch (e: any) {
      console.error("Generation Error", e);
      alert("エラーが発生しました: " + e.message);
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('この記事を完全に削除しますか？')) return;
    await db.delete(id);
    setArticles(prev => prev.filter(a => a.id !== id));
    setView('home');
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-gray-900">
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-xl group-hover:rotate-12 transition-all shadow-xl shadow-gray-200">N</div>
          <h1 className="text-xl font-black tracking-tighter">Note Master AI</h1>
        </div>
        <div className="flex gap-6">
          <button onClick={() => setView('schedule')} className="text-xs font-bold text-gray-400 hover:text-black transition-colors">予約一覧</button>
          <button onClick={() => setView('create')} className="bg-black text-white px-6 py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-lg shadow-gray-100">新規記事作成</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 py-10">
        {isGenerating && progress && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-8 text-white text-center animate-fade-in">
            <div className="max-w-md w-full">
              <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] mx-auto mb-8 flex items-center justify-center animate-bounce shadow-2xl shadow-green-500/20">
                <i className="fa-solid fa-sparkles text-4xl"></i>
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">{progress.message}</h3>
              <p className="text-sm font-bold text-gray-500 mb-10 uppercase tracking-[0.2em]">{progress.current} / {progress.total} Articles Processing</p>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <div style={{ width: `${progress.percent}%` }} className="h-full bg-green-500 transition-all duration-1000" />
              </div>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Generating high-quality editorial content...</p>
            </div>
          </div>
        )}

        {view === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {articles.length > 0 ? articles.map(a => (
              <div key={a.id} onClick={() => { setSelectedArticle(a); setView('view'); }} className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer">
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img src={a.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                </div>
                <div className="p-8">
                  <h4 className="font-black text-xl line-clamp-2 leading-tight mb-4 group-hover:text-black">{a.title}</h4>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-400">
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    <span className="bg-gray-50 px-3 py-1 rounded-full">{a.targetLength} chars</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-40 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-bold">まだ記事がありません。右上のボタンから作成しましょう。</p>
              </div>
            )}
          </div>
        )}

        {view === 'create' && <ArticleCreator onGenerateBulk={handleGenerateBulk} onCancel={() => setView('home')} />}
        {view === 'view' && selectedArticle && (
          <ArticleViewer 
            article={selectedArticle} 
            onBack={() => setView('home')} 
            onDelete={() => deleteArticle(selectedArticle.id)} 
            onUpdate={loadArticles} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
