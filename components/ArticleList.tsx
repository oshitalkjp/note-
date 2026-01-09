
import React from 'react';
import { Article } from '../types';

interface ArticleListProps {
  articles: Article[];
  onSelect: (article: Article) => void;
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <article
          key={article.id}
          onClick={() => onSelect(article)}
          className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col h-full"
        >
          <div className="relative aspect-video overflow-hidden bg-gray-100">
            {article.thumbnailUrl ? (
              <img 
                src={article.thumbnailUrl} 
                alt={article.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <i className="fa-solid fa-image text-3xl"></i>
              </div>
            )}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-700 uppercase tracking-wider">
              {article.status === 'published' ? '投稿済' : '下書き'}
            </div>
          </div>
          
          <div className="p-5 flex-grow">
            <h4 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-green-600 transition-colors">
              {article.title}
            </h4>
            <p className="text-xs text-gray-500 line-clamp-3 mb-4">
              {article.trend}
            </p>
          </div>
          
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">
              {new Date(article.createdAt).toLocaleDateString('ja-JP')}
            </span>
            <span className="text-green-600 text-xs font-bold flex items-center gap-1">
              全文を読む <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
};

export default ArticleList;
