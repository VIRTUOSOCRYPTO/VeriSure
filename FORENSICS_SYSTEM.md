# VeriSure Forensics-First Analysis System

## Overview

VeriSure now uses a **media-first forensic algorithm** that prioritizes technical signals over AI opinion. This makes the system more accurate and reliable for determining whether content is AI-generated or authentic.

## Key Principles

1. **Technical Forensics First** - Analyze hard technical signals (EXIF, metadata, compression)
2. **AI Opinion Second** - Use Claude as a secondary signal, not final authority
3. **Evidence Fusion** - Combine signals using strict, transparent rules
4. **Never 100% Certain** - All verdicts are probabilistic
5. **Confidence from Evidence** - Based on quantity and quality of signals, not AI confidence

## Forensic Analysis Pipeline

### For Images:

#### 1. EXIF Metadata Analysis
- **Camera Information**: Make, Model, Lens data
- **Timestamps**: Original capture time, modification time
- **GPS Data**: Location information
- **Software Tags**: Checks for AI generation keywords
- **Missing Fields**: Identifies absent expected camera fields

**Human Signals:**
- ✅ Complete camera EXIF present
- ✅ GPS coordinates present
- ✅ Original timestamp present
- ✅ Device manufacturer metadata

**AI Signals:**
- ⚠️ No EXIF metadata (common in AI-generated)
- ⚠️ Software field contains "midjourney", "dall-e", "stable diffusion"
- ⚠️ Missing 3+ expected camera fields

#### 2. Image Properties Analysis
- Format (JPEG, PNG, etc.)
- Dimensions and aspect ratio
- Color mode
- Transparency layers

**AI Signals:**
- ⚠️ Dimensions are multiples of 512 (typical of AI generators)
- ⚠️ Square dimensions in multiples of 64 (typical of AI models)

#### 3. Compression & Re-encoding Detection
- Compression ratio calculation
- JPEG quality analysis
- Multiple re-encoding detection
- Quantization table inspection

**Manipulation Signals:**
- ⚡ Multiple re-encodings detected
- ⚡ Unusually high compression
- ⚡ Low JPEG quality (<75)
- ⚡ Format conversion artifacts

#### 4. Statistical Analysis
- Color channel variance
- Uniformity scoring
- Noise patterns

**AI Signals:**
- ⚠️ Very low color variance (unnatural uniformity)
- ⚠️ Suspicious uniformity score

### For Videos:

#### 1. Container & Codec Analysis
- Format name (MP4, MOV, etc.)
- Video codec (H.264, HEVC, etc.)
- Audio codec presence
- Bit rate and duration

**Human Signals:**
- ✅ Standard camera codec (H.264 High/Main, HEVC)
- ✅ Device metadata present (Android, iOS)
- ✅ Creation timestamp present
- ✅ Standard camera resolution (1080p, 4K)
- ✅ Standard frame rate (24, 25, 30, 60 fps)

**AI Signals:**
- ⚠️ Dimensions are multiples of 256
- ⚠️ Unusual frame rate (<20 or >120 fps)
- ⚠️ No audio track (uncommon for recordings)

**Manipulation Signals:**
- ⚡ File size inconsistent with bit rate
- ⚡ Re-encoding artifacts

### For Audio:

#### 1. Audio Properties Analysis
- Sample rate
- Channel count
- Duration
- Encoding format

**Human Signals:**
- ✅ Recording device metadata present
- ✅ Standard recording sample rate (44.1kHz, 48kHz)
- ✅ Natural pitch variance (50-200 Hz std dev)
- ✅ Natural speech patterns with pauses

**AI Signals:**
- ⚠️ Low sample rate (16kHz, 22kHz - typical of TTS)
- ⚠️ Very low pitch variance (<5 Hz std dev)
- ⚠️ Minimal silence gaps
- ⚠️ Uniform energy levels

#### 2. Audio Signal Analysis
- Pitch variance
- Silence patterns
- Energy distribution
- Spectral characteristics

## Evidence Fusion Rules

The system uses **strict, deterministic rules** to combine forensic evidence with AI opinion:

### Rule 1: Likely AI-Generated
```
IF: ≥2 AI forensic indicators AND 0 human signals
THEN: Classification = "Likely AI-Generated"
CONFIDENCE: high (if ≥3 AI signals), medium (if 2 AI signals)
```

### Rule 2: Likely Original
```
IF: ≥2 human forensic indicators AND 0 AI signals
THEN: Classification = "Likely Original"
CONFIDENCE: high (if ≥3 human signals), medium (if 2 human signals)
```

### Rule 3: Hybrid / Manipulated
```
IF: ≥1 human signal AND ≥1 manipulation signal
THEN: Classification = "Hybrid / Manipulated"
CONFIDENCE: medium (if ≥3 total signals), low (if <3 signals)
```

### Rule 4: Unclear / Mixed Signals
```
IF: ≥1 human signal AND ≥1 AI signal (conflicting)
THEN: Classification = "Unclear / Mixed Signals"
CONFIDENCE: low
```

### Rule 5: Inconclusive
```
IF: <2 total forensic indicators OR analysis failed
THEN: Classification = "Inconclusive"
CONFIDENCE: low
```

**AI Opinion Role**: Only used as a weak tiebreaker when forensic evidence is insufficient (<2 indicators)

## Confidence Scoring

Confidence is based on **evidence availability**, not AI model confidence:

- **High Confidence**: ≥3 consistent forensic signals pointing same direction
- **Medium Confidence**: 2 consistent forensic signals
- **Low Confidence**: ≤1 signal, or conflicting signals

## Example Analysis Results

### Example 1: Real Phone Photo
```
FORENSIC SIGNALS:
✅ Camera metadata present: iPhone 14 Pro
✅ GPS coordinates present (typical of real photos)
✅ Original capture timestamp present
✅ Complete camera EXIF metadata present

VERDICT: Likely Original (high confidence)
REASON: Forensic analysis detected 4 authentic capture signals with no AI indicators
```

### Example 2: Midjourney Image
```
FORENSIC SIGNALS:
⚠️ No EXIF metadata (common in AI-generated images)
⚠️ Dimensions (1024x1024) are multiples of 512 (typical of AI generators)
⚠️ Statistical anomaly: Very low color variance (unnatural uniformity)

VERDICT: Likely AI-Generated (high confidence)
REASON: Forensic analysis detected 3 AI generation indicators with no human capture signals
```

### Example 3: Edited Photo
```
FORENSIC SIGNALS:
✅ Camera metadata present: Canon EOS R5
⚡ Multiple re-encodings detected
⚡ Low JPEG quality (65) suggests re-encoding

VERDICT: Hybrid / Manipulated (medium confidence)
REASON: Original content with 2 manipulation/editing indicators detected
```

### Example 4: Screenshot
```
FORENSIC SIGNALS:
⚠️ Missing 4 expected camera fields
⚡ PNG with editor-typical dimensions

VERDICT: Unclear / Mixed Signals (low confidence)
REASON: Only 2 forensic indicators detected - insufficient for classification
```

## API Response Format

```json
{
  "report_id": "uuid",
  "timestamp": "ISO-8601",
  "content_hash": "SHA-256",
  "origin_verdict": {
    "classification": "Likely AI-Generated | Likely Original | Hybrid / Manipulated | Unclear / Mixed Signals | Inconclusive",
    "confidence": "low | medium | high",
    "indicators": [
      "[FORENSIC] Camera metadata present: Canon EOS R5",
      "[FORENSIC] GPS coordinates present",
      "[AI OPINION] Some visual patterns observed"
    ]
  },
  "evidence": {
    "signals_detected": [
      "Camera metadata present: Canon EOS R5",
      "GPS coordinates present"
    ],
    "forensic_notes": [
      "Forensic analysis detected 2 authentic capture signals",
      "Forensic analysis: image type",
      "Evidence quality: high",
      "AI subjective assessment"
    ],
    "limitations": [
      "Analysis combines technical forensics with AI opinion",
      "Technical forensics takes priority over AI assessment",
      "Results are probabilistic, never 100% certain",
      "Advanced manipulation techniques may evade detection"
    ]
  },
  "analysis_summary": "Forensic analysis detected 2 authentic capture signals with no AI indicators. Forensic analysis of image completed. AI opinion (secondary): Content shows some natural variation."
}
```

## Technical Implementation

### Libraries Used:
- **exifread**: EXIF metadata extraction
- **Pillow (PIL)**: Image processing and analysis
- **ffmpeg-python**: Video container and codec analysis
- **librosa**: Audio signal analysis
- **mutagen**: Audio metadata extraction
- **NumPy/SciPy**: Statistical analysis

### Key Files:
- `/app/backend/forensics.py`: Forensic analysis engine
- `/app/backend/server.py`: API integration and evidence fusion

## Advantages Over AI-Only Approach

1. **Objective Evidence**: Hard technical signals don't hallucinate
2. **Transparent Rules**: Users can understand why a verdict was reached
3. **Forensically Sound**: Results can be used as supporting evidence
4. **AI as Tool**: Uses AI opinion appropriately as one signal among many
5. **No False Confidence**: Confidence reflects actual evidence, not model probability

## Limitations

1. **Metadata Can Be Stripped**: Original photos can have EXIF removed
2. **Metadata Can Be Faked**: AI tools can inject fake EXIF data
3. **Advanced Techniques**: Sophisticated manipulation may evade detection
4. **Resolution Trade-off**: Some forensic signals lost in low-resolution images
5. **Format Limitations**: Some formats (PNG) don't support full EXIF

## Best Practices for Users

1. **Upload Original Files**: Don't screenshot or re-save before analysis
2. **Check Multiple Signals**: Don't rely on single indicator
3. **Context Matters**: Consider source, purpose, and circumstances
4. **Verify Claims**: Use analysis as one factor in decision-making
5. **Report Sophisticated Scams**: Help improve detection patterns

## Future Enhancements

- Advanced AI detection using GAN fingerprinting
- Blockchain timestamp verification
- Multi-image consistency analysis
- Deep learning-based artifact detection
- Community-sourced forensic patterns
