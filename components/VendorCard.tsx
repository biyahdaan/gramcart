
import React from 'react';
import { Vendor, Translation } from '../types';

interface Props {
  vendor: Vendor;
  t: Translation;
  onBook?: (vendor: Vendor) => void;
}

export const VendorCard: React.FC<Props> = ({ vendor, t, onBook }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
      <div className="relative h-40">
        <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
        {vendor.verified && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <i className="fas fa-check-circle"></i> VERIFIED
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded">
          {vendor.distance.toFixed(1)} km away
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{vendor.name}</h3>
          <div className="flex items-center gap-1 text-xs font-bold text-green-600">
            <i className="fas fa-star"></i> {vendor.rating}
          </div>
        </div>
        <p className="text-gray-500 text-xs mb-3">{vendor.category.toUpperCase()}</p>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-lg font-bold text-gray-900">₹{vendor.price}</span>
            <span className="text-gray-400 text-[10px] ml-1">onwards</span>
          </div>
          <button 
            onClick={() => onBook?.(vendor)}
            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
          >
            {t.bookNow}
          </button>
        </div>
      </div>
    </div>
  );
};
