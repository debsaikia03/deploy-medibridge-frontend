import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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

const COUNTRIES = [/* keep your existing list unchanged */];

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
  const [country, setCountry] = useState('United States');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTabChange = async (value: string) => {
    setTab(value as 'name' | 'barcode');
    setFoodInfo(null);
    setHealthScore(null);
    setNotFound(false);
    setFoodName('');
    setBarcode('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (scanning) {
      await stopScanning();
    }
  };

  const fetchFoodInfo = async (foodName?: string, codeToSearch?: string, region?: string) => {
    setLoading(true);
    setFoodInfo(null);
    setHealthScore(null);
    setNotFound(false);
    if (codeToSearch) setBarcode(codeToSearch);

    try {
      const foodRes = await axios.get('/food/info', { params: { foodName, barcode: codeToSearch, country: region } });
      setFoodInfo(foodRes.data.data || foodRes.data.foodInfo);

      const scoreRes = await axios.get('/food/health', {
        params: { foodName, barcode: codeToSearch, ...userMetrics },
      });
      setHealthScore(scoreRes.data.data);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 404 || data?.message?.includes('No product found')) {
        setNotFound(true);
      } else {
        toast.error(data?.message || 'Failed to fetch food info');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Food Info & Health Score</CardTitle>
          <CardDescription>
            Enter a food name or scan a barcode to get nutrition and health insights.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="name">Enter Food Name</TabsTrigger>
              <TabsTrigger value="barcode">Search Barcode</TabsTrigger>
            </TabsList>

            <TabsContent value="name">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!foodName.trim()) return toast.error('Enter a food name');
                  fetchFoodInfo(foodName.trim());
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!barcode.trim()) return toast.error('Enter a barcode');
                  if (!/^\d+$/.test(barcode.trim())) return toast.error('Barcode must be a valid integer');
                  if (barcode.trim().length !== 13) return toast.error('Invalid barcode: must be exactly 13 digits');
                  fetchFoodInfo(undefined, barcode.trim(), country);
                }}
                className="flex flex-col gap-5 mt-4"
              >
                <div className="flex flex-col gap-2 text-left">
                  <label className="text-sm font-semibold">Region</label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  type="text"
                  maxLength={13}
                  value={barcode}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d{1,13}$/.test(val)) {
                      setBarcode(val);
                    }
                  }}
                />

                <Button type="submit" disabled={loading}>
                  {loading ? 'Searching...' : 'Run Search'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {foodInfo && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{foodInfo.name}</CardTitle>
                <CardDescription>
                  Calories: {foodInfo.nutrition?.energy_100g || 0} kcal
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {healthScore && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Health Score</CardTitle>
                <CardDescription>
                  Score: {healthScore.score} / 100
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {notFound && (
            <Card className="mt-6">
              <CardContent>Food Not Found</CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
