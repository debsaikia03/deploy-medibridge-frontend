import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { toast } from 'sonner';
import axios from '../../lib/axios';
import { Html5Qrcode } from 'html5-qrcode';

interface FoodInfo {
  name: string;
  ingredients: string;
  nutrition: Record<string, any>;
  barcode: string;
  image: string;
  allergens: string[];
  categories: string[];
  brands: string;
  labels: string[];
  quantity: string;
}

interface HealthScore {
  score: number;
  grade: string;
  advice: string;
  bmi: number;
  foodName: string;
}

export default function FoodInfo() {
  const [tab, setTab] = useState<'name' | 'barcode'>('name');
  const [foodName, setFoodName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [foodInfo, setFoodInfo] = useState<FoodInfo | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [userMetrics] = useState({ age: 30, height: 170, weight: 70 });
  const [notFound, setNotFound] = useState(false);
  
  // States for handling confirmations
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // --- NEW: Handle Tab Switching & Cleanup ---
  const handleTabChange = async (value: string) => {
    setTab(value as 'name' | 'barcode');
    
    // Clear results
    setFoodInfo(null);
    setHealthScore(null);
    setNotFound(false);
    
    // Clear inputs
    setFoodName('');
    setBarcode('');
    
    // Clear pending states
    setPendingFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPendingBarcode(null);
    
    // Stop camera if it was running
    if (scanning) {
      await stopScanning();
    }
  };

  const fetchFoodInfo = async (foodName?: string, codeToSearch?: string) => {
    setLoading(true);
    setFoodInfo(null);
    setHealthScore(null);
    setNotFound(false);
    if (codeToSearch) setBarcode(codeToSearch);

    try {
      const foodRes = await axios.get('/food/info', { params: { foodName, barcode: codeToSearch } });
      setFoodInfo(foodRes.data.foodInfo);
      
      const scoreRes = await axios.get('/food/health', {
        params: { foodName, barcode: codeToSearch, ...userMetrics },
      });
      setHealthScore(scoreRes.data.data);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.message === 'Error while fetching food information' && data?.error === 'No product found with the provided barcode or food name') {
        setNotFound(true);
      } else {
        toast.error(data?.message || 'Failed to fetch food info');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- CAMERA SCAN FLOW ---
  const startScanning = async () => {
    try {
      setScanning(true);
      setPendingBarcode(null);
      setBarcode('');
      
      await new Promise(resolve => setTimeout(resolve, 50));

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        toast.error('No camera found on your device');
        setScanning(false);
        return;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      const cameraId = devices.find(device => device.label.toLowerCase().includes('back'))?.id || devices[0].id;
      
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          scanner.stop().catch(console.error);
          setScanning(false);
          setPendingBarcode(decodedText);
        },
        (errorMessage: string) => {
          if (!errorMessage.includes('No MultiFormat Readers were able to detect the code')) {
             // Silently ignore frame drops
          }
        }
      );
    } catch (err: any) {
      toast.error('Failed to start camera. Check permissions.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(console.error);
      setScanning(false);
    }
  };

  const confirmCameraScan = () => {
    if (!pendingBarcode) return;
    const code = pendingBarcode;
    setPendingBarcode(null);
    fetchFoodInfo(undefined, code);
  };

  const cancelCameraScan = () => {
    setPendingBarcode(null);
    startScanning(); 
  };

  // --- IMAGE UPLOAD FLOW ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setBarcode('');

    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const confirmImageUpload = async () => {
    if (!pendingFile) return;
    setLoading(true);
    try {
      const scanner = new Html5Qrcode("file-qr-reader"); 
      const decodedText = await scanner.scanFile(pendingFile, true);
      
      clearPreview();
      toast.success("Barcode found in image!");
      fetchFoodInfo(undefined, decodedText);
    } catch (err) {
      toast.error("Could not find a valid barcode in that image. Try another.");
    } finally {
      setLoading(false);
    }
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Hidden div required by html5-qrcode for file scanning */}
      <div id="file-qr-reader" style={{ display: 'none' }}></div> 

      <Card>
        <CardHeader>
          <CardTitle>Food Info & Health Score</CardTitle>
          <CardDescription>
            Enter a food name or scan a barcode to get nutrition and health insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* UPDATED: Attach handleTabChange to onValueChange */}
          <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="name">Enter Food Name</TabsTrigger>
              <TabsTrigger value="barcode">Scan Barcode</TabsTrigger>
            </TabsList>
            
            <TabsContent value="name">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!foodName.trim()) return toast.error('Enter a food name');
                  fetchFoodInfo(foodName.trim(), undefined);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="e.g. Oats, Coca Cola, etc."
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="barcode">
              <div className="flex flex-col items-center gap-6 mt-4">
                
                {/* 1. DEFAULT VIEW */}
                {!scanning && !pendingFile && !pendingBarcode && (
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button onClick={startScanning} disabled={loading}>
                      Start Camera Scan
                    </Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                      Upload Image
                    </Button>
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                  </div>
                )}

                {/* 2. CAMERA VIEW */}
                <div className={scanning ? 'flex flex-col items-center w-full' : 'hidden'}>
                  <div id="qr-reader" className="w-full max-w-md overflow-hidden rounded-xl border-2"></div>
                  <Button variant="outline" className="mt-4" onClick={stopScanning}>
                    Cancel Camera
                  </Button>
                </div>

                {/* 3. PENDING CAMERA CONFIRMATION */}
                {pendingBarcode && (
                  <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto p-6 border rounded-xl bg-muted/30 text-center shadow-sm">
                    <p className="font-medium text-muted-foreground">Barcode Detected</p>
                    <p className="text-2xl font-bold tracking-widest bg-background py-3 px-6 rounded-lg border shadow-inner">
                      {pendingBarcode}
                    </p>
                    <div className="flex gap-4 mt-2">
                      <Button onClick={confirmCameraScan} disabled={loading}>
                        Accept & Search
                      </Button>
                      <Button variant="outline" onClick={cancelCameraScan} disabled={loading}>
                        Rescan
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4. PENDING IMAGE CONFIRMATION */}
                {pendingFile && previewUrl && (
                  <div className="flex flex-col items-center gap-4 w-full text-center">
                    <p className="font-medium text-muted-foreground">Confirm Image</p>
                    <img src={previewUrl} alt="Preview" className="w-48 h-48 object-cover rounded-xl border shadow-sm" />
                    <div className="flex gap-4">
                      <Button onClick={confirmImageUpload} disabled={loading}>
                        {loading ? 'Processing...' : 'Accept & Scan'}
                      </Button>
                      <Button variant="outline" onClick={clearPreview} disabled={loading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {barcode && !scanning && !pendingFile && !pendingBarcode && (
                  <div className="text-muted-foreground text-sm">Last searched barcode: {barcode}</div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Results Area */}
          {foodInfo && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{foodInfo.name}</CardTitle>
                <CardDescription>{foodInfo.brands} &bull; {foodInfo.quantity}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap items-start">
                  {foodInfo.image && foodInfo.image !== 'No image available' && (
                    <img src={foodInfo.image} alt={foodInfo.name} className="w-32 h-32 object-cover rounded-lg border" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div><span className="font-semibold">Ingredients:</span> {foodInfo.ingredients}</div>
                    <div><span className="font-semibold">Allergens:</span> {foodInfo.allergens.join(', ') || 'None'}</div>
                    <div><span className="font-semibold">Category:</span> {foodInfo.categories[0] || 'N/A'}</div>
                    <div><span className="font-semibold">Labels:</span> {foodInfo.labels.join(', ') || 'None'}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="font-semibold">Nutrition (per 100g):</span>
                  <table className="min-w-full mt-2 border rounded text-sm bg-muted">
                    <tbody>
                      {[
                        { label: 'Energy', key: 'energy_100g', unit: foodInfo.nutrition['energy_unit'] || 'kcal', rank: 1 },
                        { label: 'Proteins', key: 'proteins_100g', unit: 'g', rank: 2 },
                        { label: 'Fiber', key: 'fiber_100g', unit: 'g', rank: 3 },
                        { label: 'Fat', key: 'fat_100g', unit: 'g', rank: 4 },
                        { label: 'Saturated Fat', key: 'saturated-fat_100g', unit: 'g', rank: 5 },
                        { label: 'Sugars', key: 'sugars_100g', unit: 'g', rank: 6 },
                        { label: 'Salt', key: 'salt_100g', unit: 'g', rank: 7 },
                      ]
                        .map(item => ({ ...item, value: foodInfo.nutrition[item.key] }))
                        .filter(item => item.value !== undefined && item.value !== 0 && item.value !== '0' && item.value !== '0.0')
                        .sort((a, b) => a.rank - b.rank)
                        .map((item) => (
                          <tr key={item.label}>
                            <td className="py-1 px-2 font-medium">{item.label}</td>
                            <td className="py-1 px-2">{item.value} {item.unit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {healthScore && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Health Score</CardTitle>
                <CardDescription>
                  <span className="font-semibold">Score:</span> {healthScore.score} / 100 &bull; <span className="font-semibold">Grade:</span> {healthScore.grade}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2"><span className="font-semibold">Advice:</span> {healthScore.advice}</div>
                <div><span className="font-semibold">Your BMI:</span> {healthScore.bmi}</div>
              </CardContent>
            </Card>
          )}

          {notFound && (
            <Card className="mt-6">
              <CardHeader><CardTitle>Food Not Found</CardTitle></CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-center">We're sorry, the food was not found.</div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}