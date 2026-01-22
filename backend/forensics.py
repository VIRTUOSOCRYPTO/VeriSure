"""
Media Forensics Module
Analyzes images, videos, and audio for authenticity using technical signals.
AI opinion is secondary to hard forensic evidence.
"""

import exifread
from PIL import Image
from PIL.ExifTags import TAGS
import io
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import hashlib
import json
import logging

# Audio analysis
try:
    import librosa
    import soundfile as sf
    import numpy as np
    from mutagen import File as MutagenFile
    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False

# Video analysis
try:
    import ffmpeg
    VIDEO_AVAILABLE = True
except ImportError:
    VIDEO_AVAILABLE = False

logger = logging.getLogger(__name__)


class ForensicAnalyzer:
    """Main forensic analysis engine"""
    
    def __init__(self):
        self.ai_generation_keywords = [
            'midjourney', 'dall-e', 'dalle', 'stable diffusion', 'ai', 
            'artificial intelligence', 'generated', 'synthetic', 'deepfake',
            'gan', 'diffusion', 'neural'
        ]
    
    def analyze_image(self, image_bytes: bytes) -> Dict:
        """
        Analyze image for authenticity using forensic signals.
        Returns hard evidence, not AI opinion.
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            
            # 1. EXIF Metadata Analysis
            exif_data = self._extract_exif(image_bytes)
            exif_signals = self._analyze_exif(exif_data)
            
            # 2. Image Properties Analysis
            properties = self._analyze_image_properties(image)
            
            # 3. Compression & Re-encoding Analysis
            compression_signals = self._analyze_compression(image, image_bytes)
            
            # 4. Statistical Analysis
            statistical_signals = self._analyze_image_statistics(image)
            
            return {
                'media_type': 'image',
                'exif': exif_signals,
                'properties': properties,
                'compression': compression_signals,
                'statistics': statistical_signals,
                'forensic_indicators': self._extract_forensic_indicators(
                    exif_signals, properties, compression_signals, statistical_signals
                )
            }
            
        except Exception as e:
            logger.error(f"Image analysis error: {str(e)}")
            return {
                'media_type': 'image',
                'error': str(e),
                'forensic_indicators': {
                    'human_signals': [],
                    'ai_signals': [],
                    'manipulation_signals': [],
                    'inconclusive_signals': ['Analysis failed - insufficient data']
                }
            }
    
    def _extract_exif(self, image_bytes: bytes) -> Dict:
        """Extract EXIF metadata from image"""
        try:
            # Try exifread first
            tags = exifread.process_file(io.BytesIO(image_bytes), details=False)
            exif_dict = {str(tag): str(tags[tag]) for tag in tags.keys() if not tag.startswith('Thumbnail')}
            
            # Also try PIL
            image = Image.open(io.BytesIO(image_bytes))
            if hasattr(image, '_getexif') and image._getexif():
                exif = image._getexif()
                for tag_id, value in exif.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag not in exif_dict:
                        exif_dict[str(tag)] = str(value)
            
            return exif_dict
            
        except Exception as e:
            logger.warning(f"EXIF extraction error: {str(e)}")
            return {}
    
    def _analyze_exif(self, exif_data: Dict) -> Dict:
        """Analyze EXIF data for authenticity signals"""
        signals = {
            'has_exif': len(exif_data) > 0,
            'camera_info': None,
            'software': None,
            'datetime': None,
            'gps': None,
            'suspicious_software': False,
            'missing_expected_fields': [],
            'ai_generation_indicators': []
        }
        
        if not exif_data:
            signals['missing_expected_fields'].append('No EXIF data (common in AI-generated images)')
            return signals
        
        # Check for camera information
        camera_fields = ['Image Make', 'Image Model', 'EXIF LensModel', 'EXIF LensMake']
        for field in camera_fields:
            if field in exif_data:
                signals['camera_info'] = f"{field}: {exif_data[field]}"
                break
        
        # Check software field for AI generation indicators
        software_fields = ['Image Software', 'Software', 'EXIF Software']
        for field in software_fields:
            if field in exif_data:
                software_value = str(exif_data[field]).lower()
                signals['software'] = exif_data[field]
                
                # Check for AI generation keywords
                for keyword in self.ai_generation_keywords:
                    if keyword in software_value:
                        signals['ai_generation_indicators'].append(f"Software field contains '{keyword}'")
                        signals['suspicious_software'] = True
        
        # Check datetime
        datetime_fields = ['Image DateTime', 'EXIF DateTimeOriginal', 'DateTime']
        for field in datetime_fields:
            if field in exif_data:
                signals['datetime'] = exif_data[field]
                break
        
        # Check GPS
        gps_fields = ['GPS GPSLatitude', 'GPS GPSLongitude']
        has_gps = any(field in exif_data for field in gps_fields)
        if has_gps:
            signals['gps'] = 'Present'
        
        # Expected fields for real camera photos
        expected_fields = ['Image Make', 'Image Model', 'EXIF DateTimeOriginal', 'EXIF ExifVersion']
        for field in expected_fields:
            if field not in exif_data:
                signals['missing_expected_fields'].append(field)
        
        return signals
    
    def _analyze_image_properties(self, image: Image.Image) -> Dict:
        """Analyze image properties"""
        return {
            'format': image.format,
            'mode': image.mode,
            'size': image.size,
            'width': image.width,
            'height': image.height,
            'aspect_ratio': round(image.width / image.height, 2) if image.height > 0 else 0,
            'has_transparency': image.mode in ('RGBA', 'LA', 'P'),
            'info': {k: str(v) for k, v in image.info.items() if k not in ['exif', 'icc_profile']}
        }
    
    def _analyze_compression(self, image: Image.Image, image_bytes: bytes) -> Dict:
        """Analyze compression and re-encoding artifacts"""
        signals = {
            'format': image.format,
            'file_size': len(image_bytes),
            'compression_ratio': 0.0,
            're_encoding_detected': False,
            're_encoding_indicators': []
        }
        
        try:
            # Calculate compression ratio
            uncompressed_size = image.width * image.height * len(image.mode)
            signals['compression_ratio'] = round(len(image_bytes) / uncompressed_size, 4)
            
            # Check for JPEG artifacts (multiple re-encoding)
            if image.format == 'JPEG':
                # Very low compression ratio suggests multiple re-encodings
                if signals['compression_ratio'] < 0.05:
                    signals['re_encoding_detected'] = True
                    signals['re_encoding_indicators'].append('Unusually high compression (possible multiple re-encodings)')
                
                # Check quality from image info
                if 'quality' in image.info:
                    quality = image.info['quality']
                    if quality < 75:
                        signals['re_encoding_indicators'].append(f'Low JPEG quality ({quality}) suggests re-encoding')
                
                # Check for quantization tables
                if 'quantization' in image.info:
                    signals['re_encoding_indicators'].append('Non-standard quantization tables detected')
            
            # PNG should not have JPEG artifacts
            elif image.format == 'PNG':
                # PNG is lossless, check if it's converted from JPEG
                if 'jpeg' in str(image.info).lower():
                    signals['re_encoding_indicators'].append('PNG contains JPEG metadata (format conversion)')
            
        except Exception as e:
            logger.warning(f"Compression analysis error: {str(e)}")
        
        return signals
    
    def _analyze_image_statistics(self, image: Image.Image) -> Dict:
        """Analyze statistical properties of image"""
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Get pixel data
            pixels = list(image.getdata())
            
            # Sample pixels for efficiency (max 10000 pixels)
            sample_size = min(10000, len(pixels))
            import random
            sampled_pixels = random.sample(pixels, sample_size)
            
            # Calculate channel statistics
            r_values = [p[0] for p in sampled_pixels]
            g_values = [p[1] for p in sampled_pixels]
            b_values = [p[2] for p in sampled_pixels]
            
            def calc_stats(values):
                mean = sum(values) / len(values)
                variance = sum((x - mean) ** 2 for x in values) / len(values)
                std_dev = variance ** 0.5
                return {'mean': round(mean, 2), 'std_dev': round(std_dev, 2)}
            
            stats = {
                'red_channel': calc_stats(r_values),
                'green_channel': calc_stats(g_values),
                'blue_channel': calc_stats(b_values),
                'uniformity_score': 0.0,
                'suspicious_patterns': []
            }
            
            # Check for unnatural uniformity (common in AI-generated images)
            avg_std = (stats['red_channel']['std_dev'] + 
                      stats['green_channel']['std_dev'] + 
                      stats['blue_channel']['std_dev']) / 3
            
            if avg_std < 20:
                stats['suspicious_patterns'].append('Very low color variance (unnatural uniformity)')
                stats['uniformity_score'] = round((20 - avg_std) / 20, 2)
            elif avg_std > 100:
                stats['suspicious_patterns'].append('Very high color variance (possible noise injection)')
            
            return stats
            
        except Exception as e:
            logger.warning(f"Statistical analysis error: {str(e)}")
            return {'error': str(e)}
    
    def _extract_forensic_indicators(self, exif_signals, properties, compression_signals, statistical_signals) -> Dict:
        """Extract clear forensic indicators from all signals"""
        indicators = {
            'human_signals': [],
            'ai_signals': [],
            'manipulation_signals': [],
            'inconclusive_signals': []
        }
        
        # HUMAN SIGNALS (strong evidence of real camera capture)
        if exif_signals.get('camera_info'):
            indicators['human_signals'].append(f"Camera metadata present: {exif_signals['camera_info']}")
        
        if exif_signals.get('gps'):
            indicators['human_signals'].append("GPS coordinates present (typical of real photos)")
        
        if exif_signals.get('datetime') and not exif_signals.get('suspicious_software'):
            indicators['human_signals'].append("Original capture timestamp present")
        
        # Check for expected camera EXIF fields
        missing_fields = exif_signals.get('missing_expected_fields', [])
        if len(missing_fields) == 0 and exif_signals.get('has_exif'):
            indicators['human_signals'].append("Complete camera EXIF metadata present")
        
        # AI SIGNALS (strong evidence of AI generation)
        if exif_signals.get('ai_generation_indicators'):
            for indicator in exif_signals['ai_generation_indicators']:
                indicators['ai_signals'].append(indicator)
        
        if not exif_signals.get('has_exif'):
            indicators['ai_signals'].append("No EXIF metadata (common in AI-generated images)")
        elif len(missing_fields) >= 3:
            indicators['ai_signals'].append(f"Missing {len(missing_fields)} expected camera fields")
        
        # Check for AI-typical image dimensions (often multiples of 64 or 512)
        width = properties.get('width', 0)
        height = properties.get('height', 0)
        if width > 0 and height > 0:
            if width % 512 == 0 and height % 512 == 0:
                indicators['ai_signals'].append(f"Dimensions ({width}x{height}) are multiples of 512 (typical of AI generators)")
            elif width % 64 == 0 and height % 64 == 0 and width == height:
                indicators['ai_signals'].append(f"Square dimensions ({width}x{height}) in multiples of 64 (typical of AI models)")
        
        # Statistical anomalies
        if statistical_signals.get('suspicious_patterns'):
            for pattern in statistical_signals['suspicious_patterns']:
                indicators['ai_signals'].append(f"Statistical anomaly: {pattern}")
        
        # MANIPULATION SIGNALS (editing, re-encoding)
        if compression_signals.get('re_encoding_detected'):
            indicators['manipulation_signals'].append("Multiple re-encodings detected")
        
        if compression_signals.get('re_encoding_indicators'):
            for indicator in compression_signals['re_encoding_indicators']:
                indicators['manipulation_signals'].append(indicator)
        
        # PNG format but with very specific dimensions suggests export from editor
        if properties.get('format') == 'PNG' and width % 8 == 0 and height % 8 == 0:
            indicators['manipulation_signals'].append("PNG with editor-typical dimensions")
        
        # INCONCLUSIVE SIGNALS
        if not indicators['human_signals'] and not indicators['ai_signals']:
            indicators['inconclusive_signals'].append("Insufficient forensic evidence to determine origin")
        
        return indicators
    
    def analyze_video(self, video_bytes: bytes, filename: str = "video.mp4") -> Dict:
        """Analyze video for authenticity using forensic signals"""
        if not VIDEO_AVAILABLE:
            return {
                'media_type': 'video',
                'error': 'Video analysis not available',
                'forensic_indicators': {
                    'human_signals': [],
                    'ai_signals': [],
                    'manipulation_signals': [],
                    'inconclusive_signals': ['Video forensics unavailable - install ffmpeg']
                }
            }
        
        try:
            # Save temporarily for analysis
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                tmp.write(video_bytes)
                tmp_path = tmp.name
            
            try:
                # Probe video metadata
                probe = ffmpeg.probe(tmp_path)
                
                video_streams = [s for s in probe['streams'] if s['codec_type'] == 'video']
                audio_streams = [s for s in probe['streams'] if s['codec_type'] == 'audio']
                
                signals = {
                    'media_type': 'video',
                    'format': probe['format'].get('format_name'),
                    'duration': float(probe['format'].get('duration', 0)),
                    'size': int(probe['format'].get('size', 0)),
                    'bit_rate': int(probe['format'].get('bit_rate', 0)),
                    'video_codec': video_streams[0].get('codec_name') if video_streams else None,
                    'video_profile': video_streams[0].get('profile') if video_streams else None,
                    'frame_rate': video_streams[0].get('r_frame_rate') if video_streams else None,
                    'width': video_streams[0].get('width') if video_streams else None,
                    'height': video_streams[0].get('height') if video_streams else None,
                    'has_audio': len(audio_streams) > 0,
                    'audio_codec': audio_streams[0].get('codec_name') if audio_streams else None,
                    'metadata': probe['format'].get('tags', {})
                }
                
                # Extract forensic indicators
                indicators = self._extract_video_forensic_indicators(signals)
                signals['forensic_indicators'] = indicators
                
                return signals
                
            finally:
                import os
                os.unlink(tmp_path)
                
        except Exception as e:
            logger.error(f"Video analysis error: {str(e)}")
            return {
                'media_type': 'video',
                'error': str(e),
                'forensic_indicators': {
                    'human_signals': [],
                    'ai_signals': [],
                    'manipulation_signals': [],
                    'inconclusive_signals': ['Video analysis failed - insufficient data']
                }
            }
    
    def _extract_video_forensic_indicators(self, signals: Dict) -> Dict:
        """Extract forensic indicators from video signals"""
        indicators = {
            'human_signals': [],
            'ai_signals': [],
            'manipulation_signals': [],
            'inconclusive_signals': []
        }
        
        # Check metadata
        metadata = signals.get('metadata', {})
        if metadata:
            # Check for camera/device info
            if 'com.android.version' in metadata or 'com.apple.quicktime.make' in metadata:
                indicators['human_signals'].append("Device metadata present (mobile device recording)")
            
            if 'creation_time' in metadata:
                indicators['human_signals'].append("Original creation timestamp present")
        
        # Check codec and profile
        codec = signals.get('video_codec')
        profile = signals.get('video_profile')
        
        if codec == 'h264' and profile in ['High', 'Main']:
            indicators['human_signals'].append(f"Standard camera codec (H.264 {profile})")
        elif codec == 'hevc':
            indicators['human_signals'].append("Modern camera codec (HEVC/H.265)")
        
        # Check frame rate
        frame_rate = signals.get('frame_rate', '')
        if frame_rate:
            # Parse frame rate
            if '/' in frame_rate:
                num, denom = frame_rate.split('/')
                fps = float(num) / float(denom)
                
                # Standard camera frame rates
                if fps in [24, 25, 30, 60, 120]:
                    indicators['human_signals'].append(f"Standard camera frame rate ({fps} fps)")
                elif fps < 20 or fps > 120:
                    indicators['ai_signals'].append(f"Unusual frame rate ({fps} fps) - uncommon for real cameras")
        
        # Check resolution
        width = signals.get('width')
        height = signals.get('height')
        if width and height:
            # Check for AI-typical dimensions
            if width % 256 == 0 and height % 256 == 0:
                indicators['ai_signals'].append(f"Dimensions ({width}x{height}) are multiples of 256 (typical of AI video generators)")
            
            # Standard camera resolutions
            standard_resolutions = [
                (1920, 1080), (1280, 720), (3840, 2160), (2560, 1440),
                (720, 480), (1080, 1920)  # including portrait
            ]
            if (width, height) in standard_resolutions:
                indicators['human_signals'].append(f"Standard camera resolution ({width}x{height})")
        
        # Check for audio
        if not signals.get('has_audio'):
            indicators['ai_signals'].append("No audio track (uncommon for real video recordings)")
        
        # Check for re-encoding signs
        bit_rate = signals.get('bit_rate', 0)
        duration = signals.get('duration', 1)
        file_size = signals.get('size', 0)
        
        if duration > 0:
            expected_size = (bit_rate * duration) / 8
            if expected_size > 0:
                size_ratio = file_size / expected_size
                if size_ratio < 0.8 or size_ratio > 1.2:
                    indicators['manipulation_signals'].append("File size inconsistent with bit rate (possible re-encoding)")
        
        # If no clear signals
        if not indicators['human_signals'] and not indicators['ai_signals']:
            indicators['inconclusive_signals'].append("Insufficient video forensic evidence")
        
        return indicators
    
    def analyze_audio(self, audio_bytes: bytes, filename: str = "audio.mp3") -> Dict:
        """Analyze audio for authenticity using forensic signals"""
        if not AUDIO_AVAILABLE:
            return {
                'media_type': 'audio',
                'error': 'Audio analysis not available',
                'forensic_indicators': {
                    'human_signals': [],
                    'ai_signals': [],
                    'manipulation_signals': [],
                    'inconclusive_signals': ['Audio forensics unavailable']
                }
            }
        
        try:
            # Save temporarily for analysis
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
            
            try:
                # Extract metadata using mutagen
                audio_file = MutagenFile(tmp_path)
                metadata = {}
                if audio_file and audio_file.tags:
                    metadata = {k: str(v) for k, v in audio_file.tags.items()}
                
                # Load audio for analysis
                y, sr = librosa.load(tmp_path, sr=None)
                
                signals = {
                    'media_type': 'audio',
                    'sample_rate': sr,
                    'duration': float(len(y)) / sr,
                    'channels': 1 if len(y.shape) == 1 else y.shape[0],
                    'metadata': metadata,
                    'encoding': None
                }
                
                # Analyze audio properties
                audio_properties = self._analyze_audio_properties(y, sr)
                signals.update(audio_properties)
                
                # Extract forensic indicators
                indicators = self._extract_audio_forensic_indicators(signals, metadata)
                signals['forensic_indicators'] = indicators
                
                return signals
                
            finally:
                os.unlink(tmp_path)
                
        except Exception as e:
            logger.error(f"Audio analysis error: {str(e)}")
            return {
                'media_type': 'audio',
                'error': str(e),
                'forensic_indicators': {
                    'human_signals': [],
                    'ai_signals': [],
                    'manipulation_signals': [],
                    'inconclusive_signals': ['Audio analysis failed - insufficient data']
                }
            }
    
    def _analyze_audio_properties(self, y: np.ndarray, sr: int) -> Dict:
        """Analyze audio signal properties"""
        try:
            properties = {}
            
            # Pitch analysis
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            if pitch_values:
                properties['pitch_mean'] = float(np.mean(pitch_values))
                properties['pitch_std'] = float(np.std(pitch_values))
                properties['pitch_variance'] = float(np.var(pitch_values))
            else:
                properties['pitch_mean'] = 0
                properties['pitch_std'] = 0
                properties['pitch_variance'] = 0
            
            # Silence detection
            intervals = librosa.effects.split(y, top_db=30)
            silence_duration = len(y) - sum(interval[1] - interval[0] for interval in intervals)
            properties['silence_ratio'] = float(silence_duration / len(y))
            properties['speech_segments'] = len(intervals)
            
            # Energy analysis
            rms = librosa.feature.rms(y=y)[0]
            properties['energy_mean'] = float(np.mean(rms))
            properties['energy_std'] = float(np.std(rms))
            
            # Spectral analysis
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            properties['spectral_centroid_mean'] = float(np.mean(spectral_centroids))
            properties['spectral_centroid_std'] = float(np.std(spectral_centroids))
            
            return properties
            
        except Exception as e:
            logger.warning(f"Audio properties analysis error: {str(e)}")
            return {}
    
    def _extract_audio_forensic_indicators(self, signals: Dict, metadata: Dict) -> Dict:
        """Extract forensic indicators from audio signals"""
        indicators = {
            'human_signals': [],
            'ai_signals': [],
            'manipulation_signals': [],
            'inconclusive_signals': []
        }
        
        # Check metadata for recording device
        if metadata:
            if any(key in metadata for key in ['encoder', 'recording_device', 'device']):
                indicators['human_signals'].append("Recording device metadata present")
        
        # Analyze pitch variance
        pitch_std = signals.get('pitch_std', 0)
        if pitch_std > 0:
            if pitch_std < 5:
                indicators['ai_signals'].append("Very low pitch variance (unnatural for human speech)")
            elif pitch_std > 50 and pitch_std < 200:
                indicators['human_signals'].append("Natural pitch variance detected")
        
        # Analyze silence patterns
        silence_ratio = signals.get('silence_ratio', 0)
        speech_segments = signals.get('speech_segments', 0)
        
        if silence_ratio < 0.05 and speech_segments > 0:
            indicators['ai_signals'].append("Minimal silence gaps (uncommon in natural speech)")
        elif silence_ratio > 0.1 and speech_segments > 3:
            indicators['human_signals'].append("Natural speech patterns with pauses")
        
        # Energy analysis
        energy_std = signals.get('energy_std', 0)
        if energy_std < 0.01:
            indicators['ai_signals'].append("Uniform energy levels (unnatural for real recordings)")
        
        # Sample rate check
        sr = signals.get('sample_rate', 0)
        if sr in [44100, 48000]:
            indicators['human_signals'].append(f"Standard recording sample rate ({sr} Hz)")
        elif sr in [16000, 22050]:
            indicators['ai_signals'].append(f"Low sample rate ({sr} Hz) - typical of TTS/AI audio")
        
        # Duration check
        duration = signals.get('duration', 0)
        if duration < 1:
            indicators['inconclusive_signals'].append("Very short audio clip - limited analysis")
        
        if not indicators['human_signals'] and not indicators['ai_signals']:
            indicators['inconclusive_signals'].append("Insufficient audio forensic evidence")
        
        return indicators


def fuse_evidence(forensic_analysis: Dict, ai_analysis: Dict) -> Tuple[str, str, str, List[str]]:
    """
    Fuse forensic evidence with AI opinion using strict rules.
    
    Rules:
    1. ≥2 AI indicators + no strong human signals → Likely AI-Generated
    2. Strong human metadata + no AI artifacts → Likely Original
    3. Human content + editing artifacts → Hybrid / Manipulated
    4. Missing or conflicting evidence → Inconclusive
    
    Returns:
        (classification, confidence, reason, all_indicators)
    """
    
    forensic_indicators = forensic_analysis.get('forensic_indicators', {})
    human_signals = forensic_indicators.get('human_signals', [])
    ai_signals = forensic_indicators.get('ai_signals', [])
    manipulation_signals = forensic_indicators.get('manipulation_signals', [])
    inconclusive_signals = forensic_indicators.get('inconclusive_signals', [])
    
    # Extract AI opinion indicators
    ai_opinion = ai_analysis.get('origin', {})
    ai_classification = ai_opinion.get('classification', 'Unclear / Mixed Signals')
    ai_indicators = ai_analysis.get('ai_signals', [])
    
    # Combine all indicators for final report
    all_indicators = (
        [f"[FORENSIC] {s}" for s in human_signals] +
        [f"[FORENSIC] {s}" for s in ai_signals] +
        [f"[FORENSIC] {s}" for s in manipulation_signals] +
        [f"[AI OPINION] {s}" for s in ai_indicators[:2]]  # Limit AI opinion signals
    )
    
    # Evidence counts
    num_human = len(human_signals)
    num_ai = len(ai_signals)
    num_manipulation = len(manipulation_signals)
    num_inconclusive = len(inconclusive_signals)
    
    # Calculate confidence based on evidence availability
    total_evidence = num_human + num_ai + num_manipulation
    
    # RULE 1: Strong AI evidence
    if num_ai >= 2 and num_human == 0:
        confidence = 'high' if num_ai >= 3 else 'medium'
        reason = f"Forensic analysis detected {num_ai} AI generation indicators with no human capture signals"
        return "Likely AI-Generated", confidence, reason, all_indicators
    
    # RULE 2: Strong human evidence
    if num_human >= 2 and num_ai == 0:
        confidence = 'high' if num_human >= 3 else 'medium'
        reason = f"Forensic analysis detected {num_human} authentic capture signals with no AI indicators"
        return "Likely Original", confidence, reason, all_indicators
    
    # RULE 3: Hybrid / Manipulated (human + manipulation signals)
    if num_human >= 1 and num_manipulation >= 1:
        confidence = 'medium' if (num_human + num_manipulation) >= 3 else 'low'
        reason = f"Original content with {num_manipulation} manipulation/editing indicators detected"
        return "Hybrid / Manipulated", confidence, reason, all_indicators
    
    # RULE 4: Conflicting evidence
    if num_human >= 1 and num_ai >= 1:
        confidence = 'low'
        reason = f"Conflicting evidence: {num_human} human signals vs {num_ai} AI indicators"
        return "Unclear / Mixed Signals", confidence, reason, all_indicators
    
    # RULE 5: Insufficient evidence - use AI opinion as weak signal
    if total_evidence < 2 or num_inconclusive > 0:
        confidence = 'low'
        
        # Check AI opinion only if we have insufficient forensic evidence
        if 'likely ai' in ai_classification.lower():
            reason = f"Limited forensic evidence; AI analysis suggests synthetic content (weak signal)"
            return "Unclear / Mixed Signals", confidence, reason, all_indicators
        elif 'likely original' in ai_classification.lower() or 'likely human' in ai_classification.lower():
            reason = f"Limited forensic evidence; AI analysis suggests original content (weak signal)"
            return "Unclear / Mixed Signals", confidence, reason, all_indicators
        
        reason = f"Insufficient forensic evidence for classification (only {total_evidence} indicators)"
        return "Inconclusive", confidence, reason, all_indicators
    
    # RULE 6: Single indicator - inconclusive
    if total_evidence == 1:
        confidence = 'low'
        reason = "Only one forensic indicator detected - insufficient for classification"
        return "Inconclusive", confidence, reason, all_indicators
    
    # Default: Inconclusive
    confidence = 'low'
    reason = "Evidence pattern does not match classification rules"
    return "Inconclusive", confidence, reason, all_indicators
