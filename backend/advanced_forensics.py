"""
Advanced Image Forensics Module
Implements ELA, noise analysis, JPEG ghost detection, and copy-move detection
"""

import numpy as np
import cv2
from PIL import Image
import io
from typing import Dict, List, Tuple, Optional
import logging
from scipy import fftpack, ndimage
from skimage.metrics import structural_similarity as ssim
from skimage.feature import match_descriptors, ORB

logger = logging.getLogger(__name__)


class AdvancedForensicAnalyzer:
    """Advanced forensic analysis techniques for image manipulation detection"""
    
    def __init__(self):
        self.ela_quality = 95  # Quality level for ELA
        self.ghost_qualities = [70, 75, 80, 85, 90, 95]  # For JPEG ghost detection
        
    def analyze_advanced_forensics(self, image_bytes: bytes) -> Dict:
        """
        Run all advanced forensic analyses on an image
        
        Args:
            image_bytes: Image file as bytes
            
        Returns:
            Dictionary with all forensic analysis results
        """
        try:
            results = {
                'ela_analysis': {},
                'noise_analysis': {},
                'jpeg_ghost': {},
                'copy_move': {},
                'composite_score': 0.0,
                'manipulation_indicators': []
            }
            
            # Run all analyses
            results['ela_analysis'] = self.error_level_analysis(image_bytes)
            results['noise_analysis'] = self.noise_pattern_analysis(image_bytes)
            results['jpeg_ghost'] = self.jpeg_ghost_detection(image_bytes)
            results['copy_move'] = self.copy_move_detection(image_bytes)
            
            # Calculate composite manipulation score
            results['composite_score'] = self._calculate_composite_score(results)
            results['manipulation_indicators'] = self._extract_manipulation_indicators(results)
            
            logger.info(f"Advanced forensics complete: composite score = {results['composite_score']:.2f}")
            return results
            
        except Exception as e:
            logger.error(f"Advanced forensics error: {str(e)}")
            return {
                'error': str(e),
                'ela_analysis': {},
                'noise_analysis': {},
                'jpeg_ghost': {},
                'copy_move': {},
                'composite_score': 0.0,
                'manipulation_indicators': ['Analysis failed']
            }
    
    def error_level_analysis(self, image_bytes: bytes) -> Dict:
        """
        Error Level Analysis (ELA) - Detects manipulated regions by compression artifacts
        
        Principle: Original vs re-compressed image differences reveal editing
        - Manipulated areas show higher error levels
        - Authentic areas show lower, uniform error levels
        """
        try:
            # Load original image
            original = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if original.mode != 'RGB':
                original = original.convert('RGB')
            
            # Save with known quality and reload
            compressed_buffer = io.BytesIO()
            original.save(compressed_buffer, format='JPEG', quality=self.ela_quality)
            compressed_buffer.seek(0)
            compressed = Image.open(compressed_buffer)
            
            # Convert to numpy arrays
            orig_array = np.array(original, dtype=np.float32)
            comp_array = np.array(compressed, dtype=np.float32)
            
            # Calculate difference (error level)
            difference = np.abs(orig_array - comp_array)
            
            # Normalize to 0-255 range
            if difference.max() > 0:
                difference = (difference / difference.max() * 255).astype(np.uint8)
            else:
                difference = difference.astype(np.uint8)
            
            # Calculate statistics
            mean_error = float(np.mean(difference))
            max_error = float(np.max(difference))
            std_error = float(np.std(difference))
            
            # Detect high-error regions (potential manipulation)
            threshold = mean_error + 2 * std_error
            high_error_pixels = np.sum(difference > threshold)
            high_error_percentage = (high_error_pixels / difference.size) * 100
            
            # Determine if manipulation is suspected
            manipulation_suspected = False
            confidence = "low"
            
            if high_error_percentage > 15 and std_error > 20:
                manipulation_suspected = True
                confidence = "high"
            elif high_error_percentage > 10 or std_error > 15:
                manipulation_suspected = True
                confidence = "medium"
            elif high_error_percentage > 5:
                manipulation_suspected = True
                confidence = "low"
            
            return {
                'mean_error_level': round(mean_error, 2),
                'max_error_level': round(max_error, 2),
                'std_deviation': round(std_error, 2),
                'high_error_percentage': round(high_error_percentage, 2),
                'manipulation_suspected': manipulation_suspected,
                'confidence': confidence,
                'interpretation': self._interpret_ela(mean_error, std_error, high_error_percentage)
            }
            
        except Exception as e:
            logger.error(f"ELA error: {str(e)}")
            return {
                'error': str(e),
                'manipulation_suspected': False,
                'confidence': 'none'
            }
    
    def noise_pattern_analysis(self, image_bytes: bytes) -> Dict:
        """
        Noise Pattern Analysis - Detects AI-generated images by noise characteristics
        
        Principle: 
        - Real photos have camera sensor noise (non-uniform, specific patterns)
        - AI images have synthetic noise (too uniform or completely absent)
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            img_array = np.array(image, dtype=np.float32)
            
            # Extract noise using high-pass filter
            # Apply Gaussian blur and subtract from original
            blurred = cv2.GaussianBlur(img_array, (5, 5), 0)
            noise = img_array - blurred
            
            # Analyze noise characteristics
            noise_mean = float(np.mean(np.abs(noise)))
            noise_std = float(np.std(noise))
            noise_variance = float(np.var(noise))
            
            # Frequency domain analysis using FFT
            gray = cv2.cvtColor(img_array.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            fft = fftpack.fft2(gray)
            fft_shift = fftpack.fftshift(fft)
            magnitude_spectrum = np.abs(fft_shift)
            
            # High frequency energy (noise indicator)
            rows, cols = gray.shape
            crow, ccol = rows // 2, cols // 2
            mask = np.zeros((rows, cols), np.uint8)
            r = min(crow, ccol) // 3
            cv2.circle(mask, (ccol, crow), r, 1, -1)
            
            high_freq_energy = float(np.sum(magnitude_spectrum * (1 - mask)))
            total_energy = float(np.sum(magnitude_spectrum))
            high_freq_ratio = high_freq_energy / total_energy if total_energy > 0 else 0
            
            # Noise consistency across image (check variance in local regions)
            patch_size = 64
            local_noise_vars = []
            
            for i in range(0, img_array.shape[0] - patch_size, patch_size):
                for j in range(0, img_array.shape[1] - patch_size, patch_size):
                    patch = noise[i:i+patch_size, j:j+patch_size]
                    local_noise_vars.append(np.var(patch))
            
            noise_consistency = float(np.std(local_noise_vars)) if local_noise_vars else 0.0
            
            # Determine if noise pattern is suspicious
            ai_suspected = False
            confidence = "low"
            
            # AI images typically have very low or very uniform noise
            if noise_std < 5 and noise_consistency < 10:
                ai_suspected = True
                confidence = "high"
                reason = "Extremely low and uniform noise (typical of AI generation)"
            elif noise_std < 8 and high_freq_ratio < 0.15:
                ai_suspected = True
                confidence = "medium"
                reason = "Unnaturally low noise pattern"
            elif noise_consistency < 5:
                ai_suspected = True
                confidence = "medium"
                reason = "Suspiciously uniform noise distribution"
            else:
                reason = "Noise pattern appears natural"
            
            return {
                'noise_mean': round(noise_mean, 2),
                'noise_std': round(noise_std, 2),
                'noise_variance': round(noise_variance, 2),
                'high_frequency_ratio': round(high_freq_ratio, 4),
                'noise_consistency': round(noise_consistency, 2),
                'ai_generation_suspected': ai_suspected,
                'confidence': confidence,
                'interpretation': reason
            }
            
        except Exception as e:
            logger.error(f"Noise analysis error: {str(e)}")
            return {
                'error': str(e),
                'ai_generation_suspected': False,
                'confidence': 'none'
            }
    
    def jpeg_ghost_detection(self, image_bytes: bytes) -> Dict:
        """
        JPEG Ghost Detection - Detects previous JPEG compressions (indicates editing)
        
        Principle:
        - Recompress image at different quality levels
        - Minimum difference indicates previous compression quality
        - Multiple minima suggest multiple editing sessions
        """
        try:
            # Load original image
            original = Image.open(io.BytesIO(image_bytes))
            if original.mode != 'RGB':
                original = original.convert('RGB')
            
            orig_array = np.array(original)
            
            # Test different quality levels
            quality_differences = []
            
            for quality in self.ghost_qualities:
                # Compress at this quality
                compressed_buffer = io.BytesIO()
                original.save(compressed_buffer, format='JPEG', quality=quality)
                compressed_buffer.seek(0)
                compressed = Image.open(compressed_buffer)
                comp_array = np.array(compressed)
                
                # Calculate MSE (Mean Squared Error)
                mse = float(np.mean((orig_array.astype(np.float32) - comp_array.astype(np.float32)) ** 2))
                quality_differences.append((quality, mse))
            
            # Find local minima (ghost signatures)
            minima = []
            for i in range(1, len(quality_differences) - 1):
                if (quality_differences[i][1] < quality_differences[i-1][1] and 
                    quality_differences[i][1] < quality_differences[i+1][1]):
                    minima.append(quality_differences[i])
            
            # Also check for global minimum
            min_diff = min(quality_differences, key=lambda x: x[1])
            
            # Detect editing
            editing_detected = False
            confidence = "low"
            
            if len(minima) >= 2:
                editing_detected = True
                confidence = "high"
                reason = f"Multiple compression artifacts detected at quality levels {[m[0] for m in minima]}"
            elif len(minima) == 1:
                editing_detected = True
                confidence = "medium"
                reason = f"Previous JPEG compression detected at quality {minima[0][0]}"
            elif min_diff[0] < 95 and min_diff[1] < 50:
                editing_detected = True
                confidence = "low"
                reason = f"Possible previous compression at quality {min_diff[0]}"
            else:
                reason = "No clear JPEG ghost signatures detected"
            
            return {
                'minima_detected': len(minima),
                'suspected_quality_levels': [m[0] for m in minima],
                'best_match_quality': min_diff[0],
                'best_match_difference': round(min_diff[1], 2),
                'editing_detected': editing_detected,
                'confidence': confidence,
                'interpretation': reason
            }
            
        except Exception as e:
            logger.error(f"JPEG ghost detection error: {str(e)}")
            return {
                'error': str(e),
                'editing_detected': False,
                'confidence': 'none'
            }
    
    def copy_move_detection(self, image_bytes: bytes) -> Dict:
        """
        Copy-Move Detection - Detects cloned regions within image
        
        Principle:
        - Extract keypoints and descriptors
        - Find similar regions using feature matching
        - Spatial patterns indicate copy-move forgery
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            img_array = np.array(image)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Use ORB for feature detection (faster than SIFT)
            orb = ORB(n_keypoints=500)
            orb.detect_and_extract(gray)
            
            keypoints = orb.keypoints
            descriptors = orb.descriptors
            
            if descriptors is None or len(descriptors) < 10:
                return {
                    'keypoints_found': 0,
                    'similar_regions': 0,
                    'copy_move_suspected': False,
                    'confidence': 'none',
                    'interpretation': 'Insufficient features for analysis'
                }
            
            # Match descriptors with themselves to find duplicates
            matches = match_descriptors(descriptors, descriptors, cross_check=True)
            
            # Filter out self-matches and close matches
            valid_matches = []
            for match in matches:
                if match[0] != match[1]:  # Not same keypoint
                    pt1 = keypoints[match[0]]
                    pt2 = keypoints[match[1]]
                    distance = np.sqrt((pt1[0] - pt2[0])**2 + (pt1[1] - pt2[1])**2)
                    
                    # Only consider matches that are spatially separated
                    if distance > 30:  # Minimum separation
                        valid_matches.append((match, distance))
            
            # Group matches by spatial proximity
            clusters = []
            for match, dist in valid_matches:
                pt1 = keypoints[match[0]]
                pt2 = keypoints[match[1]]
                
                # Check if this match belongs to existing cluster
                added = False
                for cluster in clusters:
                    # Calculate average distance to cluster
                    avg_dist = np.mean([np.sqrt((pt1[0] - kp[0])**2 + (pt1[1] - kp[1])**2) 
                                       for kp, _ in cluster])
                    if avg_dist < 50:  # Cluster threshold
                        cluster.append((pt1, match))
                        added = True
                        break
                
                if not added:
                    clusters.append([(pt1, match)])
            
            # Detect copy-move based on cluster sizes
            significant_clusters = [c for c in clusters if len(c) >= 3]
            
            copy_move_suspected = False
            confidence = "low"
            
            if len(significant_clusters) >= 2:
                copy_move_suspected = True
                confidence = "high"
                reason = f"Multiple similar regions detected ({len(significant_clusters)} clusters)"
            elif len(significant_clusters) == 1 and len(significant_clusters[0]) >= 5:
                copy_move_suspected = True
                confidence = "medium"
                reason = "Large duplicated region detected"
            elif len(valid_matches) > 20:
                copy_move_suspected = True
                confidence = "low"
                reason = "Suspicious number of feature matches"
            else:
                reason = "No clear copy-move patterns detected"
            
            return {
                'keypoints_found': len(keypoints),
                'feature_matches': len(valid_matches),
                'similar_regions': len(significant_clusters),
                'copy_move_suspected': copy_move_suspected,
                'confidence': confidence,
                'interpretation': reason
            }
            
        except Exception as e:
            logger.error(f"Copy-move detection error: {str(e)}")
            return {
                'error': str(e),
                'copy_move_suspected': False,
                'confidence': 'none'
            }
    
    def _calculate_composite_score(self, results: Dict) -> float:
        """
        Calculate composite manipulation score from all analyses
        Score: 0.0 (likely authentic) to 1.0 (likely manipulated)
        """
        score = 0.0
        
        # ELA contribution (0-0.3)
        ela = results.get('ela_analysis', {})
        if ela.get('manipulation_suspected'):
            if ela.get('confidence') == 'high':
                score += 0.3
            elif ela.get('confidence') == 'medium':
                score += 0.2
            else:
                score += 0.1
        
        # Noise analysis contribution (0-0.3)
        noise = results.get('noise_analysis', {})
        if noise.get('ai_generation_suspected'):
            if noise.get('confidence') == 'high':
                score += 0.3
            elif noise.get('confidence') == 'medium':
                score += 0.2
            else:
                score += 0.1
        
        # JPEG ghost contribution (0-0.2)
        ghost = results.get('jpeg_ghost', {})
        if ghost.get('editing_detected'):
            if ghost.get('confidence') == 'high':
                score += 0.2
            elif ghost.get('confidence') == 'medium':
                score += 0.15
            else:
                score += 0.1
        
        # Copy-move contribution (0-0.2)
        copy_move = results.get('copy_move', {})
        if copy_move.get('copy_move_suspected'):
            if copy_move.get('confidence') == 'high':
                score += 0.2
            elif copy_move.get('confidence') == 'medium':
                score += 0.15
            else:
                score += 0.1
        
        return min(score, 1.0)
    
    def _extract_manipulation_indicators(self, results: Dict) -> List[str]:
        """Extract human-readable manipulation indicators"""
        indicators = []
        
        # ELA indicators
        ela = results.get('ela_analysis', {})
        if ela.get('manipulation_suspected'):
            indicators.append(f"[ELA] {ela.get('interpretation', 'Manipulation detected')}")
        
        # Noise indicators
        noise = results.get('noise_analysis', {})
        if noise.get('ai_generation_suspected'):
            indicators.append(f"[NOISE] {noise.get('interpretation', 'Suspicious noise pattern')}")
        
        # JPEG ghost indicators
        ghost = results.get('jpeg_ghost', {})
        if ghost.get('editing_detected'):
            indicators.append(f"[JPEG] {ghost.get('interpretation', 'Previous compression detected')}")
        
        # Copy-move indicators
        copy_move = results.get('copy_move', {})
        if copy_move.get('copy_move_suspected'):
            indicators.append(f"[COPY-MOVE] {copy_move.get('interpretation', 'Cloned regions detected')}")
        
        if not indicators:
            indicators.append("No advanced manipulation indicators detected")
        
        return indicators
    
    def _interpret_ela(self, mean_error: float, std_error: float, high_error_pct: float) -> str:
        """Interpret ELA results"""
        if high_error_pct > 15 and std_error > 20:
            return "Strong indication of manipulation - significant regions show inconsistent compression"
        elif high_error_pct > 10:
            return "Moderate indication of manipulation - some regions show unusual error levels"
        elif high_error_pct > 5:
            return "Weak indication of manipulation - minor inconsistencies detected"
        else:
            return "Error levels appear consistent - no clear manipulation"
