
'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, UploadCloud, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { HowToAccordion } from './how-to-accordion';
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';


interface Step1UploadProps {
    onComplete: (data: any[], headers: string[]) => void;
}

const MAX_FILE_SIZE_MB = 50;

const sampleData = [
    { 'Order ID': 'CA-2021-152156', 'Date of Purchase': '2021-11-08', 'Customer Name': 'John Doe', 'Product': 'Office Chair', 'Category': 'Furniture', 'Quantity': 2, 'Unit Price': 100, 'Total Sale Amount': 200, 'Country': 'USA' },
    { 'Order ID': 'CA-2021-138688', 'Date of Purchase': '2021-06-12', 'Customer Name': 'Jane Smith', 'Product': 'Laptop', 'Category': 'Technology', 'Quantity': 1, 'Unit Price': 1200, 'Total Sale Amount': 1200, 'Country': 'Canada' },
    { 'Order ID': 'US-2020-108966', 'Date of Purchase': '2020-10-11', 'Customer Name': 'Sam Green', 'Product': 'Desk Lamp', 'Category': 'Office Supplies', 'Quantity': 5, 'Unit Price': 15, 'Total Sale Amount': 75, 'Country': 'USA' },
    { 'Order ID': 'EU-2022-104443', 'Date of Purchase': '2022-01-23', 'Customer Name': 'Anna Williams', 'Product': 'Monitor', 'Category': 'Technology', 'Quantity': 2, 'Unit Price': 300, 'Total Sale Amount': 600, 'Country': 'Germany' },
];

export function Step1Upload({ onComplete }: Step1UploadProps) {
    const [data, setData] = useState<any[] | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
    const [headerRow, setHeaderRow] = useState<number>(1);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const resetUpload = useCallback(() => {
        setData(null);
        setHeaders([]);
        setFileName(null);
        setWorkbook(null);
        setSheetNames([]);
        setSelectedSheets([]);
        setHeaderRow(1);
        setIsReadingFile(false);
        setIsParsing(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const parseWorkbook = useCallback((wb: XLSX.WorkBook, pHeaderRow: number, pSelectedSheets: string[]) => {
        if (!wb || wb.SheetNames.length === 0 || pSelectedSheets.length === 0) {
            setData(null);
            setHeaders([]);
            return;
        }
        if (pHeaderRow < 1) {
            toast({ variant: "destructive", title: "Invalid Header Row", description: "Header row must be 1 or greater." });
            setData(null);
            setHeaders([]);
            return;
        }

        try {
            let allData: any[] = [];
            let canonicalHeaders: string[] = [];
            let headerMapping: { uniqueHeader: string; originalIndex: number }[] = [];


            // Find canonical headers from the first valid selected sheet
            for (const sheetName of pSelectedSheets) {
                 if (!wb.Sheets[sheetName]) continue;
                 const worksheet = wb.Sheets[sheetName];
                 const sheetJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: true });

                 if (sheetJson.length >= pHeaderRow) {
                    const firstSheetHeadersRaw = (sheetJson[pHeaderRow - 1] as any[]).map(String);
                    
                    const counts: Record<string, number> = {};
                    const currentHeaderMapping = firstSheetHeadersRaw.map((header, index) => {
                        const trimmedHeader = header.trim();
                        if (!trimmedHeader) {
                            return { uniqueHeader: `_col_${index + 1}`, originalIndex: index, isEmpty: true };
                        }
                        if (trimmedHeader in counts) {
                            counts[trimmedHeader]++;
                            return { uniqueHeader: `${trimmedHeader} (${counts[trimmedHeader]})`, originalIndex: index, isEmpty: false };
                        }
                        counts[trimmedHeader] = 1;
                        return { uniqueHeader: trimmedHeader, originalIndex: index, isEmpty: false };
                    });

                    const nonEmptyMapping = currentHeaderMapping.filter(h => !h.isEmpty);

                    if (nonEmptyMapping.length > 0) {
                        headerMapping = nonEmptyMapping;
                        canonicalHeaders = headerMapping.map(h => h.uniqueHeader);
                        break;
                    }
                 }
            }
            
            if (canonicalHeaders.length === 0) {
                 toast({
                    variant: "destructive",
                    title: "No Valid Headers Found",
                    description: `Could not find any column headers at row ${pHeaderRow} in your selected sheets. Please ensure the row number is correct and the row is not empty.`,
                });
                setData(null);
                setHeaders([]);
                return;
            }
            
            setHeaders(canonicalHeaders);

            for (const sheetName of pSelectedSheets) {
                if (!wb.Sheets[sheetName]) continue;
                const worksheet = wb.Sheets[sheetName];
                const sheetJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: true });

                if (sheetJson.length < pHeaderRow) {
                    continue; // Skip sheets that don't have the header row
                }
                
                const dataRows = sheetJson.slice(pHeaderRow).map(rowArray => {
                    const rowObject: any = {};
                    headerMapping.forEach(({ uniqueHeader, originalIndex }) => {
                       rowObject[uniqueHeader] = (rowArray as any[])[originalIndex] ?? '';
                    });
                    return rowObject;
                }).filter(row => Object.values(row).some(val => val !== "" && val !== null && val !== undefined)); // Filter out completely empty rows

                allData = allData.concat(dataRows);
            }

            if (allData.length === 0) {
                toast({
                    variant: "destructive",
                    title: "No Data Found",
                    description: `Could not find any data rows using header row ${pHeaderRow} in any of the selected sheets.`,
                });
                setData(null);
                setHeaders([]);
                return;
            }

            setData(allData);

        } catch (err) {
            console.error("Workbook parsing error:", err);
            toast({
                variant: "destructive",
                title: "Workbook Parse Error",
                description: "An error occurred while parsing. Please check the file format and header row.",
            });
            resetUpload();
        }
    }, [toast, resetUpload]);
    
    useEffect(() => {
        if (workbook && selectedSheets.length > 0) {
            parseWorkbook(workbook, headerRow, selectedSheets);
        } else if (workbook) { // Workbook loaded, but no sheets selected
            setData(null);
            setHeaders([]);
        }
    }, [workbook, headerRow, selectedSheets, parseWorkbook]);


    const handleFile = (file: File) => {
        if (!file) return;

        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "File Too Large",
                description: `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
            });
            return;
        }

        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

        if (!validExtensions.includes(fileExtension)) {
            toast({
                variant: "destructive",
                title: "Invalid File Type",
                description: "Please upload a valid Excel (.xls, .xlsx) or CSV file.",
            });
            return;
        }
        
        resetUpload();
        setFileName(file.name);

        const reader = new FileReader();
        
        reader.onloadstart = () => {
            setIsReadingFile(true);
            setUploadProgress(0);
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(progress);
            }
        };

        reader.onloadend = () => {
            setIsReadingFile(false);
            setUploadProgress(100);
        };
        
        reader.onload = (e) => {
            setIsParsing(true);
            // Use setTimeout to allow the UI to update and show the parsing loader
            setTimeout(() => {
                try {
                    const fileContent = e.target?.result;
                    const wb = XLSX.read(fileContent, { type: 'array' });
                    setWorkbook(wb);
                    setSheetNames(wb.SheetNames);
                    setSelectedSheets(wb.SheetNames); // Select all sheets by default
                } catch (err) {
                    console.error("File parsing error:", err);
                    toast({
                        variant: "destructive",
                        title: "File Read Error",
                        description: "Could not parse the file. Please ensure it's a valid and uncorrupted file.",
                    });
                    resetUpload();
                } finally {
                    setIsParsing(false);
                }
            }, 50);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current?.click();

    const handleLoadSampleData = () => {
        setData(sampleData);
        setHeaders(Object.keys(sampleData[0]));
        setFileName("sample_data.xlsx");
        setWorkbook(null);
        setSheetNames([]);
        setSelectedSheets([]);
        setHeaderRow(1);
    };

    const handleSheetSelectionChange = (sheetName: string, isChecked: boolean) => {
        setSelectedSheets(prev => 
            isChecked ? [...prev, sheetName] : prev.filter(s => s !== sheetName)
        );
    };
    
    const handleSelectAllSheets = (isChecked: boolean) => {
        setSelectedSheets(isChecked ? sheetNames : []);
    };
    
    return (
        <div className="grid grid-cols-1 gap-8 items-start">
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>1. Upload Your Data</CardTitle>
                    <CardDescription>Upload an Excel/CSV file, or use sample data. You can select which sheets to include.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {isReadingFile ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                            <p className="font-medium text-lg">Reading file...</p>
                            <p className="text-sm text-muted-foreground">{fileName}</p>
                            <div className="w-full px-4">
                                <Progress value={uploadProgress} className="w-full" />
                                <p className="text-sm font-medium mt-2">{uploadProgress}%</p>
                            </div>
                        </div>
                    ) : isParsing ? (
                         <div className="text-center p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="font-medium text-lg">Parsing File</p>
                            <p className="text-sm text-muted-foreground">Please wait, this may take a moment for large files...</p>
                        </div>
                    ) : !fileName ? (
                        <div
                            className={cn(
                                "text-center p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-primary transition-colors",
                                isDragging && "border-primary bg-primary/10"
                            )}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={triggerFileSelect}
                        >
                            <UploadCloud className="w-12 h-12 text-muted-foreground" />
                            <p className="text-muted-foreground">Drag & drop your Excel/CSV file here</p>
                            <p className="text-xs text-muted-foreground">or click to browse</p>
                            <p className="text-xs text-muted-foreground mt-2">(Max {MAX_FILE_SIZE_MB}MB)</p>
                            <p className="text-xs text-muted-foreground mt-4">Alternatively</p>
                            <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleLoadSampleData(); }}>
                                <FileText className="mr-2 h-4 w-4" /> Load Sample Data
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                             <div className="text-center p-4 border-2 border-solid rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-primary" />
                                    <span className="font-medium text-sm">{fileName}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={resetUpload}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            {workbook && (
                                <div className="space-y-4 text-sm p-3 border rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="header-row" className="font-medium whitespace-nowrap">
                                            Headers in Row:
                                        </Label>
                                        <Input
                                            id="header-row"
                                            type="number"
                                            min="1"
                                            value={headerRow}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (val >= 1) { setHeaderRow(val); }
                                            }}
                                            className="w-20 h-8"
                                            aria-label="Header row number"
                                        />
                                    </div>
                                    {sheetNames.length > 1 && (
                                        <div className="space-y-2 pt-2">
                                            <Label className="font-medium">Sheets to Include:</Label>
                                             <div className="flex items-center space-x-2 pl-1 pt-1">
                                                <Checkbox
                                                    id="select-all-sheets"
                                                    checked={selectedSheets.length === sheetNames.length}
                                                    onCheckedChange={(checked) => handleSelectAllSheets(!!checked)}
                                                />
                                                <Label htmlFor="select-all-sheets" className="font-normal text-sm">Select All</Label>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 pl-7">
                                                {sheetNames.map(name => (
                                                    <div key={name} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`sheet-${name}`}
                                                            checked={selectedSheets.includes(name)}
                                                            onCheckedChange={(checked) => handleSheetSelectionChange(name, !!checked)}
                                                        />
                                                        <Label htmlFor={`sheet-${name}`} className="font-normal text-sm truncate" title={name}>
                                                            {name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {data && !isReadingFile && !isParsing &&(
                        <div>
                            <h3 className="font-medium mb-2">Data Preview ({data.length.toLocaleString()} rows from {workbook ? `${selectedSheets.length} sheet(s)`: 'sample data'})</h3>
                            <ScrollArea className="h-60 rounded-md border">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            {headers.map((header, index) => <TableHead key={`${header}-${index}`}>{header}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.slice(0, 10).map((row, i) => (
                                            <TableRow key={i}>
                                                {headers.map((header, index) => <TableCell key={`${header}-${index}`}>{String(row[header])}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="w-full space-y-4">
                        <HowToAccordion title="How does data upload work?">
                            <p>This application helps you visualize your data. Here's how to start:</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li><strong>Upload Data:</strong> Drag and drop your Excel (.xls, .xlsx) or CSV file into the upload area, or click to browse for a file. You can also click "Load Sample Data" to see how it works.</li>
                                <li><strong>Set Header Row:</strong> Specify which row in your file contains the column headers. This is usually the first row. This setting will be applied to all sheets.</li>
                                <li><strong>Select Sheets (for Excel files):</strong> If your file has multiple sheets, you can choose which ones to include. Their data will be automatically combined into a single dataset. This requires the header columns to be consistent across your selected sheets.</li>
                                <li><strong>Preview & Continue:</strong> Once a file is processed, a preview of your combined data will appear. Verify it looks correct, then click Next to configure your dashboard.</li>
                            </ol>
                        </HowToAccordion>
                        <Button 
                            disabled={!data || headers.length === 0 || (workbook != null && selectedSheets.length === 0)}
                            onClick={() => onComplete(data!, headers)}
                            className="w-full"
                        >
                            Next: Configure Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
