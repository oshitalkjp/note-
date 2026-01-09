
import React, { useState, useEffect, useCallback } from 'react';
import { Article, GenerationProgress } from './types';
import { gemini } from './geminiService';
import ArticleList from './components/ArticleList';
import ArticleCreator from './components/ArticleCreator';
import ArticleViewer from './components/ArticleViewer';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'create' | 'view'>('home');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const ok = await gemini.checkApiKey();
      setHasApiKey(ok);
    };
    checkKey();
    
    // Load local storage
    const saved = localStorage.getItem('note_articles');
    if (saved) {
      setArticles(JSON.parse(saved));
    }
  }, []);

  const saveArticle = (article: Article) => {
    const newArticles = [article, ...articles];
    setArticles(newArticles);
    localStorage.setItem('note_articles', JSON.stringify(newArticles));
  };

  const handleOpenKey = async () => {
    await gemini.openKeySelector();
    setHasApiKey(true);
  };

  const handleGenerate = async (trend: string, refs: string[]) => {
    // Check key again right before starting
    const currentKeyOk = await gemini.checkApiKey();
    if (!currentKeyOk) {
      alert("この記事の生成にはGemini 3 Proを使用するため、支払い設定済みのAPIキーの選択が必要です。");
      await handleOpenKey();
      return;
    }

    setIsGenerating(true);
    setProgress({ step: 'searching', message: 'トレンドを調査し、構成案を作成中...', percent: 10 });

    try {
      // 1. Outline
      const outlineData = await gemini.searchAndOutline(trend, refs);
      setProgress({ step: 'writing', message: '記事を執筆中（1万字規模のため時間がかかります）...', percent: 30 });

      // 2. Content Generation
      let fullContent = '';
      const sectionImages: any[] = [];
      
      for (let i = 0; i < outlineData.outline.length; i++) {
        const section = outlineData.outline[i];
        const content = await gemini.generateSectionContent(outlineData.title, section, trend);
        fullContent += `## ${section.heading}\n\n${content}\n\n`;
        
        if (i === 0 || i === Math.floor(outlineData.outline.length / 2)) {
          setProgress({ step: 'imaging', message: `セクション ${i+1} の画像を生成中...`, percent: 40 + (i * 10) });
          const imgUrl = await gemini.generateSectionImage(section.heading);
          sectionImages.push({
            id: Math.random().toString(36).substr(2, 9),
            url: imgUrl,
            description: section.heading,
            sectionIndex: i
          });
        }
        
        setProgress({ step: 'writing', message: `執筆中 (${i+1}/${outlineData.outline.length} セクション)...`, percent: 30 + ((i+1) / outlineData.outline.length * 40) });
      }

      // 3. Thumbnail
      setProgress({ step: 'imaging', message: 'メインサムネイルを生成中...', percent: 85 });
      const thumbUrl = await gemini.generateThumbnail(outlineData.title);

      const newArticle: Article = {
        id: Date.now().toString(),
        trend,
        title: outlineData.title,
        content: fullContent,
        thumbnailUrl: thumbUrl,
        sectionImages: sectionImages,
        createdAt: new Date().toISOString(),
        status: 'draft',
        references: refs
      };

      saveArticle(newArticle);
      setSelectedArticle(newArticle);
      setView('view');
      setProgress({ step: 'complete', message: '完了しました！', percent: 100 });
    } catch (error: any) {
      console.error("Generation error:", error);
      
      const errorMsg = error.message || '';
      if (errorMsg.includes('403') || errorMsg.toLowerCase().includes('permission denied')) {
        alert("権限エラー(403)が発生しました。Gemini 3 Proを使用するには、支払い設定済みのGCPプロジェクトから発行されたAPIキーを選択する必要があります。キー選択ダイアログを開きます。");
        setHasApiKey(false);
        await handleOpenKey();
      } else if (errorMsg.includes('Requested entity was not found')) {
        alert("モデルが見つからないか、プロジェクトの権限が不足しています。APIキーを再度選択してください。");
        setHasApiKey(false);
        await handleOpenKey();
      } else {
        alert(`エラーが発生しました: ${errorMsg}`);
      }
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-xl font-bold text-gray-800">Note Master AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {!hasApiKey ? (
              <button 
                onClick={handleOpenKey}
                className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200 hover:bg-red-100 flex items-center gap-1 animate-pulse"
              >
                <i className="fa-solid fa-triangle-exclamation"></i> キー未設定（要クリック）
              </button>
            ) : (
              <button 
                onClick={handleOpenKey}
                className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 hover:bg-green-100"
              >
                <i className="fa-solid fa-key mr-1"></i> キーを変更
              </button>
            )}
            <button 
              onClick={() => setView('create')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <i className="fa-solid fa-pen-nib mr-2"></i> 記事を作成
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        {isGenerating && progress && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4 animate-pulse">
                  <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{progress.message}</h3>
                <p className="text-gray-500 mt-2 text-sm">Gemini 3 Pro & Pro Imageを使用中。これには支払い設定済みのAPIキーが必要です。</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${progress.percent}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">{progress.percent}% 完了</p>
            </div>
          </div>
        )}

        {view === 'home' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-100">
              <div className="max-w-2xl">
                {!hasApiKey && (
                  <div className="mb-4 bg-amber-100 border-l-4 border-amber-500 p-4 text-amber-800 text-sm flex items-start gap-3 rounded-r-lg">
                    <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                    <div>
                      <p className="font-bold">APIキーの設定が必要です</p>
                      <p>Gemini 3の高度なモデルを使用するため、<a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline font-bold">支払い設定済み</a>のAPIキーを右上から選択してください。</p>
                    </div>
                  </div>
                )}
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                  トレンドから、<br />
                  1万字の深掘り記事を。<br />
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                  最新トレンドやURLを投げるだけで、Gemini 3 ProがAI生成とは思えない「人間味」と「考察」のある記事を自動執筆。サムネイルも挿絵もAIが文脈に合わせて自動生成します。
                </p>
                <button 
                  onClick={() => setView('create')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2"
                >
                  今すぐ執筆を開始する <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">過去の投稿ライブラリ</h3>
                <span className="text-sm text-gray-500">{articles.length} 件の記事</span>
              </div>
              {articles.length > 0 ? (
                <ArticleList 
                  articles={articles} 
                  onSelect={(a) => {
                    setSelectedArticle(a);
                    setView('view');
                  }} 
                />
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="text-gray-300 text-5xl mb-4">
                    <i className="fa-solid fa-newspaper"></i>
                  </div>
                  <p className="text-gray-500">まだ記事がありません。新しい記事を作成してみましょう。</p>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'create' && (
          <ArticleCreator 
            onGenerate={handleGenerate} 
            onCancel={() => setView('home')} 
          />
        )}

        {view === 'view' && selectedArticle && (
          <ArticleViewer 
            article={selectedArticle} 
            onBack={() => setView('home')} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <p>© 2024 Note Master AI - Powered by Gemini 3 Pro & Imagen 4</p>
      </footer>
    </div>
  );
};

export default App;
