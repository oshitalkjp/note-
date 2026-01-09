
import React, { useState } from 'react';

interface ArticleCreatorProps {
  onGenerate: (trend: string, refs: string[]) => void;
  onCancel: () => void;
}

const ArticleCreator: React.FC<ArticleCreatorProps> = ({ onGenerate, onCancel }) => {
  const [trend, setTrend] = useState('');
  const [refs, setRefs] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trend.trim()) return;
    const refList = refs.split('\n').filter(r => r.trim() !== '');
    onGenerate(trend, refList);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">新しい記事を作成</h2>
        <p className="text-gray-500">トレンドの話題や解説したいテーマを教えてください。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            トレンド・テーマ (1文でも可)
          </label>
          <textarea
            required
            value={trend}
            onChange={(e) => setTrend(e.target.value)}
            placeholder="例: Apple Vision Proがもたらす空間コンピューティングの未来と、我々の生活の変容について"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[100px] outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            参考URL・引用元の情報 (任意・複数可)
          </label>
          <textarea
            value={refs}
            onChange={(e) => setRefs(e.target.value)}
            placeholder="URLや補足したい事実を1行ずつ入力してください..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[100px] outline-none transition-all"
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <i className="fa-solid fa-circle-info text-blue-500 mt-1"></i>
          <p className="text-xs text-blue-700 leading-relaxed">
            Gemini 3 Proが自動でGoogle検索を行い、最新の事実関係を調査します。執筆には通常1〜3分程度かかります。
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
          >
            生成を開始する
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleCreator;
