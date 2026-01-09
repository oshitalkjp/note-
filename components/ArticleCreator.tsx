
import React, { useState } from 'react';
import { TargetLength } from '../types';

interface ArticleCreatorProps {
  onGenerateBulk: (trends: string[], refs: string[], startAt: string, intervalDays: number, length: TargetLength) => void;
  onCancel: () => void;
}

const ArticleCreator: React.FC<ArticleCreatorProps> = ({ onGenerateBulk, onCancel }) => {
  const [trendsText, setTrendsText] = useState('');
  const [refsText, setRefsText] = useState(''); // 参考URL/資料用
  const [startAt, setStartAt] = useState('');
  const [intervalDays, setIntervalDays] = useState(1);
  const [length, setLength] = useState<TargetLength>(4000);

  const lengthOptions: TargetLength[] = [2000, 4000, 6000, 8000, 10000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trends = trendsText.split('\n').map(t => t.trim()).filter(t => t !== '');
    const refs = refsText.split('\n').map(r => r.trim()).filter(r => r !== '');
    
    if (trends.length === 0) {
      alert('トレンドを1つ以上入力してください。');
      return;
    }
    if (!startAt) {
      alert('最初の投稿予定日時を設定してください。');
      return;
    }
    onGenerateBulk(trends, refs, startAt, intervalDays, length);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 animate-fade-in mb-20">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 text-green-600 rounded-2xl mb-4">
          <i className="fa-solid fa-layer-group text-xl"></i>
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">一括生成・予約設定</h2>
        <p className="text-gray-500 font-medium">トレンドと資料を入力して、スケジュールを組んでください。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-3 flex justify-between">
            <span>トレンド（1行に1つのテーマを入力）<span className="text-red-500 ml-1">*</span></span>
            <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-[10px]">
              現在 {trendsText.split('\n').filter(t => t.trim()).length} 記事分
            </span>
          </label>
          <textarea
            required
            value={trendsText}
            onChange={(e) => setTrendsText(e.target.value)}
            placeholder="AIが変える未来の教育&#10;2025年の仮想通貨トレンド&#10;最新の働き方改革..."
            className="w-full px-6 py-5 rounded-3xl border border-gray-200 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 min-h-[120px] outline-none transition-all font-medium leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-3">
            参考URL・資料テキスト（任意）
            <span className="text-gray-400 font-normal ml-2">※すべての記事に反映されます</span>
          </label>
          <textarea
            value={refsText}
            onChange={(e) => setRefsText(e.target.value)}
            placeholder="参考にするサイトのURLや、引用したい事実関係、独自の文体ルールなどを入力してください..."
            className="w-full px-6 py-5 rounded-3xl border border-gray-200 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 min-h-[100px] outline-none transition-all font-medium text-sm text-gray-600 bg-gray-50/30"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">
              初回投稿の日時<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">
              投稿間隔（日）
            </label>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <input
                type="number"
                min="1"
                max="30"
                value={intervalDays}
                onChange={(e) => setIntervalDays(parseInt(e.target.value))}
                className="w-full bg-transparent px-4 py-2 text-center font-black text-lg outline-none"
              />
              <span className="text-gray-400 font-bold shrink-0 pr-4">日おき</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-3">
            各記事の目標ボリューム
          </label>
          <div className="grid grid-cols-5 gap-3">
            {lengthOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLength(opt)}
                className={`py-4 text-sm font-black rounded-2xl border-2 transition-all ${
                  length === opt 
                    ? 'bg-green-600 border-green-600 text-white shadow-xl shadow-green-100 scale-105' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-green-200'
                }`}
              >
                {opt}<span className="block font-medium text-[10px] mt-0.5">文字</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-8 py-5 rounded-3xl border-2 border-gray-100 text-gray-400 font-bold hover:bg-gray-50 hover:text-gray-600 transition-all"
          >
            戻る
          </button>
          <button
            type="submit"
            className="flex-[2] px-8 py-5 rounded-3xl bg-green-600 text-white font-black hover:bg-green-700 shadow-2xl shadow-green-200 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            一括生成＆予約を確定
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleCreator;
