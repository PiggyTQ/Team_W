import React from 'react';
import ProductIcon from './ProductIcon';
export default function LearningCover({career}){return <ProductIcon className="learning-cover-art" size={120} name={{data:'testing',ai:'brain',security:'shield',frontend:'browser'}[career]||'code'}/>;}
