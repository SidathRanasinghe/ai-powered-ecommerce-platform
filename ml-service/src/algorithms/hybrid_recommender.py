"""
Hybrid recommendation algorithm combining collaborative and content-based filtering
"""

from typing import List, Dict, Optional
import numpy as np
import logging
from .collaborative_filtering import CollaborativeFilteringEngine
from .content_based_filtering import ContentBasedFilteringEngine

logger = logging.getLogger(__name__)

class HybridRecommender:
    def __init__(self, cf_engine: CollaborativeFilteringEngine, cbf_engine: ContentBasedFilteringEngine):
        self.cf_engine = cf_engine
        self.cbf_engine = cbf_engine
        self.weights = {
            'collaborative': 0.6,
            'content': 0.4
        }
    
    def get_recommendations(self, user_id: str, n_recommendations: int = 10, 
                          user_profile: Optional[Dict] = None) -> List[Dict]:
        """Get hybrid recommendations"""
        try:
            # Get collaborative filtering recommendations
            cf_recs = self.cf_engine.get_user_recommendations(user_id, n_recommendations * 2)
            
            # Get content-based recommendations if user profile is available
            cbf_recs = []
            if user_profile:
                cbf_recs = self.cbf_engine.get_user_recommendations(user_id, user_profile, n_recommendations * 2)
            
            # Combine recommendations
            combined = self._combine_recommendations(cf_recs, cbf_recs, n_recommendations)
            
            return combined
            
        except Exception as e:
            logger.error(f"Error in hybrid recommendations: {str(e)}")
            return []
    
    def _combine_recommendations(self, cf_recs: List[Dict], cbf_recs: List[Dict], 
                               n_recommendations: int) -> List[Dict]:
        """Combine recommendations from different algorithms"""
        combined = {}
        
        # Add collaborative filtering recommendations
        for rec in cf_recs:
            product_id = rec['product_id']
            if product_id not in combined:
                combined[product_id] = {
                    'product_id': product_id,
                    'scores': [],
                    'methods': []
                }
            combined[product_id]['scores'].append(rec['predicted_rating'] * self.weights['collaborative'])
            combined[product_id]['methods'].append('collaborative')
        
        # Add content-based recommendations
        for rec in cbf_recs:
            product_id = rec['product_id']
            if product_id not in combined:
                combined[product_id] = {
                    'product_id': product_id,
                    'scores': [],
                    'methods': []
                }
            combined[product_id]['scores'].append(rec['similarity_score'] * self.weights['content'])
            combined[product_id]['methods'].append('content')
        
        # Calculate final scores
        final_recommendations = []
        for product_id, data in combined.items():
            avg_score = np.mean(data['scores'])
            method_count = len(data['methods'])
            
            # Boost score if recommended by multiple methods
            if method_count > 1:
                avg_score *= 1.2
            
            final_recommendations.append({
                'product_id': product_id,
                'score': avg_score,
                'confidence': min(avg_score, 1.0),
                'methods': data['methods']
            })
        
        # Sort and return top N
        final_recommendations.sort(key=lambda x: x['score'], reverse=True)
        return final_recommendations[:n_recommendations]