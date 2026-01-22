"""
PDF Report Generator
Generates professional PDF reports for analysis results
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime
from io import BytesIO
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PDFReportGenerator:
    """Generate PDF reports for analysis results"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Risk level styles
        self.styles.add(ParagraphStyle(
            name='HighRisk',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#dc2626'),
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='MediumRisk',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#f59e0b'),
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='LowRisk',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#16a34a'),
            fontName='Helvetica-Bold'
        ))
    
    def generate_report(self, analysis_data: Dict[str, Any]) -> BytesIO:
        """
        Generate PDF report from analysis data
        
        Args:
            analysis_data: Analysis result dictionary
            
        Returns:
            BytesIO object containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Build document content
        story = []
        
        # Header
        story.extend(self._build_header(analysis_data))
        
        # Origin Verdict Section
        story.extend(self._build_origin_section(analysis_data))
        
        # Scam Assessment Section
        story.extend(self._build_scam_section(analysis_data))
        
        # Evidence Section
        story.extend(self._build_evidence_section(analysis_data))
        
        # Recommendations Section
        story.extend(self._build_recommendations_section(analysis_data))
        
        # Footer
        story.extend(self._build_footer(analysis_data))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return buffer
    
    def _build_header(self, data: Dict) -> list:
        """Build report header"""
        elements = []
        
        # Title
        title = Paragraph("<b>VeriSure Analysis Report</b>", self.styles['CustomTitle'])
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # Report metadata
        report_id = data.get('report_id', 'N/A')
        timestamp = data.get('timestamp', 'N/A')
        
        # Parse timestamp
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            formatted_time = dt.strftime('%B %d, %Y at %I:%M %p UTC')
        except:
            formatted_time = timestamp
        
        meta_data = [
            ['Report ID:', report_id],
            ['Generated:', formatted_time],
            ['Content Hash:', data.get('content_hash', 'N/A')[:32] + '...']
        ]
        
        meta_table = Table(meta_data, colWidths=[2*inch, 4.5*inch])
        meta_table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(meta_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_origin_section(self, data: Dict) -> list:
        """Build origin verdict section"""
        elements = []
        origin = data.get('origin_verdict', {})
        
        # Section header
        header = Paragraph("<b>Origin Verdict</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Classification with color
        classification = origin.get('classification', 'Unknown')
        confidence = origin.get('confidence', 'low').upper()
        
        classification_text = f"<b>Classification:</b> {classification} (Confidence: {confidence})"
        elements.append(Paragraph(classification_text, self.styles['Normal']))
        elements.append(Spacer(1, 0.1*inch))
        
        # Indicators
        indicators = origin.get('indicators', [])
        if indicators:
            elements.append(Paragraph("<b>Key Indicators:</b>", self.styles['Normal']))
            for indicator in indicators:
                bullet_text = f"• {indicator}"
                elements.append(Paragraph(bullet_text, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 0.2*inch))
        return elements
    
    def _build_scam_section(self, data: Dict) -> list:
        """Build scam assessment section"""
        elements = []
        scam = data.get('scam_assessment', {})
        
        # Section header
        header = Paragraph("<b>Scam Assessment</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Risk level with color
        risk_level = scam.get('risk_level', 'low').upper()
        style_name = {
            'HIGH': 'HighRisk',
            'MEDIUM': 'MediumRisk',
            'LOW': 'LowRisk'
        }.get(risk_level, 'Normal')
        
        risk_text = f"<b>Risk Level: {risk_level}</b>"
        elements.append(Paragraph(risk_text, self.styles[style_name]))
        elements.append(Spacer(1, 0.1*inch))
        
        # Scam patterns
        patterns = scam.get('scam_patterns', [])
        if patterns and patterns[0] != "No known scam patterns detected":
            elements.append(Paragraph("<b>Detected Scam Patterns:</b>", self.styles['Normal']))
            for pattern in patterns:
                bullet_text = f"• {pattern}"
                elements.append(Paragraph(bullet_text, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        # Behavioral flags
        flags = scam.get('behavioral_flags', [])
        if flags and flags[0] != "No behavioral manipulation detected":
            elements.append(Paragraph("<b>Behavioral Red Flags:</b>", self.styles['Normal']))
            for flag in flags:
                bullet_text = f"• {flag}"
                elements.append(Paragraph(bullet_text, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 0.2*inch))
        return elements
    
    def _build_evidence_section(self, data: Dict) -> list:
        """Build evidence section"""
        elements = []
        evidence = data.get('evidence', {})
        
        # Section header
        header = Paragraph("<b>Technical Evidence</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Signals detected
        signals = evidence.get('signals_detected', [])
        if signals and signals[0] != "No technical signals detected":
            elements.append(Paragraph("<b>Forensic Signals:</b>", self.styles['Normal']))
            for signal in signals[:8]:  # Limit to 8 signals
                bullet_text = f"• {signal}"
                elements.append(Paragraph(bullet_text, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        # Forensic notes
        notes = evidence.get('forensic_notes', [])
        if notes:
            elements.append(Paragraph("<b>Analysis Notes:</b>", self.styles['Normal']))
            for note in notes[:5]:  # Limit to 5 notes
                bullet_text = f"• {note}"
                elements.append(Paragraph(bullet_text, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 0.2*inch))
        return elements
    
    def _build_recommendations_section(self, data: Dict) -> list:
        """Build recommendations section"""
        elements = []
        recommendations = data.get('recommendations', {})
        
        # Section header
        header = Paragraph("<b>Recommendations</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Severity
        severity = recommendations.get('severity', 'info').upper()
        severity_text = f"<b>Severity:</b> {severity}"
        elements.append(Paragraph(severity_text, self.styles['Normal']))
        elements.append(Spacer(1, 0.1*inch))
        
        # Actions
        actions = recommendations.get('actions', [])
        if actions:
            elements.append(Paragraph("<b>Recommended Actions:</b>", self.styles['Normal']))
            for i, action in enumerate(actions, 1):
                action_text = f"{i}. {action}"
                elements.append(Paragraph(action_text, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 0.2*inch))
        return elements
    
    def _build_footer(self, data: Dict) -> list:
        """Build report footer"""
        elements = []
        
        # Summary
        summary = data.get('analysis_summary', '')
        if summary:
            elements.append(Paragraph("<b>Analysis Summary:</b>", self.styles['SectionHeader']))
            elements.append(Paragraph(summary, self.styles['Normal']))
            elements.append(Spacer(1, 0.2*inch))
        
        # Disclaimer
        disclaimer = Paragraph(
            "<i><font size=8>Disclaimer: This analysis is provided for informational purposes only. "
            "Results are probabilistic and should be verified independently. VeriSure is not "
            "responsible for decisions made based on this report.</font></i>",
            self.styles['Normal']
        )
        elements.append(disclaimer)
        
        return elements
