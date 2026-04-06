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

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", "World"
];

export default function FoodInfo() {
  const [tab, setTab] = useState<'name' | 'barcode'>('name');
  const [foodName, setFoodName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [foodInfo, setFoodInfo] = useState<FoodInfo | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [userMetrics] = useState({ age: 30, height: 170, weight: 70 });
  const [notFound, setNotFound] = useState(false);
  const [country, setCountry] = useState('India');
  
  // REMOVED setPreviewUrl to fix TS6133
  const [previewUrl] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleTabChange = async (value: string) => {
    setTab(value as 'name' | 'barcode');
    setFoodInfo(null);
    setHealthScore(null);
    setNotFound(false);
    setFoodName('');
    setBarcode('');
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
      <div id="file-qr-reader" style={{ display: 'none' }}></div> 

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
                    <SelectTrigger className="w-full text-left font-normal bg-background">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-sm font-semibold">Barcode Number</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={13}
                    value={barcode}
                    placeholder="Enter a 13-digit barcode number"
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d{1,13}$/.test(val)) {
                        setBarcode(val);
                      }
                    }}
                    className="w-full"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[hsl(220,90%,48%)] hover:bg-[hsl(220,90%,38%)] text-white"
                >
                  {loading ? 'Searching...' : 'Run Search'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {foodInfo && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#0082c5]">{foodInfo.name}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {foodInfo.quantity !== 'Not available' ? `Per ${foodInfo.quantity} - ` : ''}
                  Calories: {foodInfo.nutrition?.energy_100g || 0}kcal | 
                  Fat: {foodInfo.nutrition?.fat_100g || 0}g | 
                  Carbs: {foodInfo.nutrition?.carbohydrates_100g || 0}g | 
                  Protein: {foodInfo.nutrition?.proteins_100g || 0}g
                </CardDescription>
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
