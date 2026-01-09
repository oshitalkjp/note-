
import React from 'react';
import { Article } from '../types';

interface ArticleListProps {
  articles: Article[];
  onSelect: (article: Article) => void;
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {articles.map((article) => (
        <article
          key={article.id}
          onClick={() => onSelect(article)}
          className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-gray-100 flex flex-col h-full hover:-translate-y-2 duration-300"
        >
          <div className="relative aspect-video overflow-hidden">
            <img 
              src={article.thumbnailUrl} 
              alt={article.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute top-4 right-4">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl ${
                article.status === 'scheduled' ? 'bg-black text-white' : 'bg-white text-black'
              }`}>
                {article.status === 'scheduled' ? '予約中' : '投稿済'}
              </span>
            </div>
          </div>
          
          <div className="p-8 flex-grow">
            <h4 className="text-xl font-black text-gray-900 line-clamp-2 mb-3 leading-snug group-hover:text-black transition-colors">
              {article.title}
            </h4>
            <p className="text-sm text-gray-400 line-clamp-2 font-medium">
              {article.trend}
            </p>
          </div>
          
          <div className="px-8 py-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">作成日</span>
              <span className="text-xs font-black text-gray-600">
                {new Date(article.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default ArticleList;
