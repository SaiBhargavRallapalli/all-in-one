import dynamic from "next/dynamic";
import type { Tool } from "@/lib/tools-registry";
import {
  CUSTOM_TOOL_SLUGS,
  DATETIME_TOOL_SLUGS,
  FINANCE_TOOL_SLUGS,
  HEALTH_TOOL_SLUGS,
  MATH_TOOL_SLUGS,
} from "@/lib/custom-tool-slugs";

export { CUSTOM_TOOL_SLUGS };

// Each tool is its own chunk — only the visited tool's code is downloaded
// next/dynamic requires options as object literals (not shared vars)
const ImageResizerTool        = dynamic(() => import("@/components/tools/ImageResizerTool"), { ssr: false });
const PdfPageEditorTool       = dynamic(() => import("@/components/tools/PdfPageEditorTool"), { ssr: false });
const MergePdfTool            = dynamic(() => import("@/components/tools/MergePdfTool"), { ssr: false });
const SplitPdfTool            = dynamic(() => import("@/components/tools/SplitPdfTool"), { ssr: false });
const CompressPdfTool         = dynamic(() => import("@/components/tools/CompressPdfTool"), { ssr: false });
const PdfToJpgTool            = dynamic(() => import("@/components/tools/PdfToJpgTool"), { ssr: false });
const RotatePdfTool           = dynamic(() => import("@/components/tools/RotatePdfTool"), { ssr: false });
const WatermarkPdfTool        = dynamic(() => import("@/components/tools/WatermarkPdfTool"), { ssr: false });
const OrganizePdfTool         = dynamic(() => import("@/components/tools/OrganizePdfTool"), { ssr: false });
const PdfPageNumbersTool      = dynamic(() => import("@/components/tools/PdfPageNumbersTool"), { ssr: false });
const PdfCompareTool          = dynamic(() => import("@/components/tools/PdfCompareTool"), { ssr: false });
const TextToPdfTool           = dynamic(() => import("@/components/tools/TextToPdfTool"), { ssr: false });
const HtmlToPdfTool           = dynamic(() => import("@/components/tools/HtmlToPdfTool"), { ssr: false });
const ImageToPdfTool          = dynamic(() => import("@/components/tools/ImageToPdfTool"), { ssr: false });
const XmlSuiteTool            = dynamic(() => import("@/components/tools/XmlSuiteTool"));
const QrCodeTool              = dynamic(() => import("@/components/tools/QrCodeTool"));
const AgeCalculatorTool       = dynamic(() => import("@/components/tools/AgeCalculatorTool"));
const BmiCalculatorTool       = dynamic(() => import("@/components/tools/BmiCalculatorTool"));
const CompoundInterestTool    = dynamic(() => import("@/components/tools/CompoundInterestTool"));
const LoanEmiTool             = dynamic(() => import("@/components/tools/LoanEmiTool"));
const ImageCompressorTool     = dynamic(() => import("@/components/tools/ImageCompressorTool"), { ssr: false });
const ContrastCheckerTool     = dynamic(() => import("@/components/tools/ContrastCheckerTool"));
const GradientGeneratorTool   = dynamic(() => import("@/components/tools/GradientGeneratorTool"));
const CurrencyConverterTool   = dynamic(() => import("@/components/tools/CurrencyConverterTool"));
const FinanceFormTools        = dynamic(() => import("@/components/tools/FinanceFormTools"));
const HealthFormTools         = dynamic(() => import("@/components/tools/HealthFormTools"));
const MathFormTools           = dynamic(() => import("@/components/tools/MathFormTools"));
const DateTimeFormTools       = dynamic(() => import("@/components/tools/DateTimeFormTools"));
const BackgroundRemoverTool   = dynamic(() => import("@/components/tools/BackgroundRemoverTool"), { ssr: false });
const HtmlPreviewTool         = dynamic(() => import("@/components/tools/HtmlPreviewTool"));
const Base64ImageTool         = dynamic(() => import("@/components/tools/Base64ImageTool"), { ssr: false });
const StringInspectorTool     = dynamic(() => import("@/components/tools/StringInspectorTool"));
const MarkdownPreviewTool     = dynamic(() => import("@/components/tools/MarkdownPreviewTool"));
const RegexTesterTool         = dynamic(() => import("@/components/tools/RegexTesterTool"));
const UuidGeneratorTool       = dynamic(() => import("@/components/tools/UuidGeneratorTool"));
const HttpStatusReferenceTool = dynamic(() => import("@/components/tools/HttpStatusReferenceTool"));
const CssBoxShadowTool        = dynamic(() => import("@/components/tools/CssBoxShadowTool"));
const ImageFormatConverterTool = dynamic(() => import("@/components/tools/ImageFormatConverterTool"), { ssr: false });
const ImageMergerTool           = dynamic(() => import("@/components/tools/ImageMergerTool"), { ssr: false });
const SvgOptimizerTool        = dynamic(() => import("@/components/tools/SvgOptimizerTool"), { ssr: false });
const ExifViewerTool          = dynamic(() => import("@/components/tools/ExifViewerTool"), { ssr: false });
const UnicodeCheckerTool      = dynamic(() => import("@/components/tools/UnicodeCheckerTool"));
const NotepadPlusPlusTool     = dynamic(() => import("@/components/tools/NotepadPlusPlusTool"), { ssr: false });
const MermaidEditorTool       = dynamic(() => import("@/components/tools/MermaidEditorTool"), { ssr: false });
const TimezoneConverterTool   = dynamic(() => import("@/components/tools/TimezoneConverterTool"));
const WebSocketTesterTool     = dynamic(() => import("@/components/tools/WebSocketTesterTool"), { ssr: false });
const IpynbToPdfTool          = dynamic(() => import("@/components/tools/IpynbToPdfTool"), { ssr: false });
const GitignoreGeneratorTool  = dynamic(() => import("@/components/tools/GitignoreGeneratorTool"));
const LicenseGeneratorTool    = dynamic(() => import("@/components/tools/LicenseGeneratorTool"));
const EnvValidatorTool        = dynamic(() => import("@/components/tools/EnvValidatorTool"));
const DnsLookupTool           = dynamic(() => import("@/components/tools/DnsLookupTool"));
const IpInfoTool              = dynamic(() => import("@/components/tools/IpInfoTool"));
const NpmCompareTool          = dynamic(() => import("@/components/tools/NpmCompareTool"));
const ColorConverterTool      = dynamic(() => import("@/components/tools/ColorConverterTool"));
const ColorPaletteTool        = dynamic(() => import("@/components/tools/ColorPaletteTool"));
const ExpenseSplitterTool     = dynamic(() => import("@/components/tools/ExpenseSplitterTool"));
const VideoConverterTool      = dynamic(() => import("@/components/tools/VideoConverterTool"), { ssr: false });

export default function CustomToolOutlet({ slug, tool }: { slug: string; tool: Tool }) {
  if (FINANCE_TOOL_SLUGS.has(slug))  return <FinanceFormTools tool={tool} />;
  if (HEALTH_TOOL_SLUGS.has(slug))   return <HealthFormTools tool={tool} />;
  if (MATH_TOOL_SLUGS.has(slug))     return <MathFormTools tool={tool} />;
  if (DATETIME_TOOL_SLUGS.has(slug)) return <DateTimeFormTools tool={tool} />;

  switch (slug) {
    case "background-remover":       return <BackgroundRemoverTool tool={tool} />;
    case "image-resizer":            return <ImageResizerTool tool={tool} />;
    case "image-merger":             return <ImageMergerTool tool={tool} />;
    case "image-compressor":         return <ImageCompressorTool tool={tool} />;
    case "pdf-page-editor":          return <PdfPageEditorTool tool={tool} />;
    case "merge-pdf":                return <MergePdfTool tool={tool} />;
    case "split-pdf":                return <SplitPdfTool tool={tool} />;
    case "compress-pdf":             return <CompressPdfTool tool={tool} />;
    case "pdf-to-jpg":               return <PdfToJpgTool tool={tool} />;
    case "rotate-pdf":               return <RotatePdfTool tool={tool} />;
    case "watermark-pdf":            return <WatermarkPdfTool tool={tool} />;
    case "organize-pdf":             return <OrganizePdfTool tool={tool} />;
    case "pdf-page-numbers":         return <PdfPageNumbersTool tool={tool} />;
    case "pdf-compare":              return <PdfCompareTool tool={tool} />;
    case "image-to-pdf":             return <ImageToPdfTool tool={tool} />;
    case "text-to-pdf":              return <TextToPdfTool tool={tool} />;
    case "html-to-pdf":              return <HtmlToPdfTool tool={tool} />;
    case "xml-suite":                return <XmlSuiteTool tool={tool} />;
    case "qr-code":                  return <QrCodeTool tool={tool} />;
    case "age-calculator":           return <AgeCalculatorTool tool={tool} />;
    case "bmi-calculator":           return <BmiCalculatorTool tool={tool} />;
    case "compound-interest":        return <CompoundInterestTool tool={tool} />;
    case "loan-emi-calculator":      return <LoanEmiTool tool={tool} />;
    case "contrast-checker":         return <ContrastCheckerTool tool={tool} />;
    case "gradient-generator":       return <GradientGeneratorTool tool={tool} />;
    case "currency-converter":       return <CurrencyConverterTool tool={tool} />;
    case "html-preview":             return <HtmlPreviewTool tool={tool} />;
    case "base64-image":             return <Base64ImageTool tool={tool} />;
    case "string-inspector":         return <StringInspectorTool tool={tool} />;
    case "markdown-preview":         return <MarkdownPreviewTool tool={tool} />;
    case "regex-tester":             return <RegexTesterTool tool={tool} />;
    case "uuid-generator":           return <UuidGeneratorTool tool={tool} />;
    case "http-status-reference":    return <HttpStatusReferenceTool tool={tool} />;
    case "css-box-shadow":           return <CssBoxShadowTool tool={tool} />;
    case "image-format-converter":   return <ImageFormatConverterTool tool={tool} />;
    case "svg-optimizer":            return <SvgOptimizerTool tool={tool} />;
    case "exif-viewer":              return <ExifViewerTool tool={tool} />;
    case "unicode-checker":          return <UnicodeCheckerTool tool={tool} />;
    case "notepad-plus-plus":        return <NotepadPlusPlusTool tool={tool} />;
    case "mermaid-editor":           return <MermaidEditorTool tool={tool} />;
    case "timezone-converter":       return <TimezoneConverterTool tool={tool} />;
    case "websocket-tester":         return <WebSocketTesterTool tool={tool} />;
    case "ipynb-to-pdf":             return <IpynbToPdfTool tool={tool} />;
    case "gitignore-generator":      return <GitignoreGeneratorTool tool={tool} />;
    case "license-generator":        return <LicenseGeneratorTool tool={tool} />;
    case "env-validator":            return <EnvValidatorTool tool={tool} />;
    case "dns-lookup":               return <DnsLookupTool tool={tool} />;
    case "ip-info":                  return <IpInfoTool tool={tool} />;
    case "npm-compare":              return <NpmCompareTool tool={tool} />;
    case "color-converter":          return <ColorConverterTool tool={tool} />;
    case "color-palette":            return <ColorPaletteTool tool={tool} />;
    case "expense-splitter":         return <ExpenseSplitterTool tool={tool} />;
    case "video-converter":          return <VideoConverterTool tool={tool} />;
    case "gif-maker":                return <VideoConverterTool tool={tool} />;
    default:                         return null;
  }
}
