import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import axios from '../../lib/axios';

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

const COUNTRIES = ["India", "United States", "United Kingdom", "Australia", "Canada", "World"];

export default function FoodInfo() {
  const [tab, setTab] = useState<'name' | 'barcode'>('name');
  const [foodName, setFoodName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [foodInfo, setFoodInfo] = useState<FoodInfo | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [country, setCountry] = useState('India');

  const userMetrics = { age: 30, height: 170, weight: 70 };

  const handleTabChange = (value: string) => {
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

    try {
      const foodRes = await axios.get('/food/info', {
        params: { foodName, barcode: codeToSearch, country: region }
      });

      setFoodInfo(foodRes.data.data || foodRes.data.foodInfo);

      const scoreRes = await axios.get('/food/health', {
        params: { foodName, barcode: codeToSearch, ...userMetrics }
      });

      setHealthScore(scoreRes.data.data);
    } catch (err: any) {
      const data = err.response?.data;

      if (
        data?.message === 'Error while fetching food information' &&
        data?.error === 'No product found with the provided barcode or food name'
      ) {
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
            Enter a food name or barcode to get nutrition and health insights.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="name">Enter Food Name</TabsTrigger>
              <TabsTrigger value="barcode">Search Barcode</TabsTrigger>
            </TabsList>

            {/* NAME SEARCH */}
            <TabsContent value="name">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!foodName.trim()) return toast.error('Enter a food name');
                  fetchFoodInfo(foodName.trim());
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="e.g. Oats, Coca Cola"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>

            {/* BARCODE SEARCH */}
            <TabsContent value="barcode">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!barcode.trim()) return toast.error('Enter a barcode');
                  if (!/^\d+$/.test(barcode)) return toast.error('Barcode must be numeric');
                  if (barcode.length !== 13) return toast.error('Barcode must be 13 digits');

                  fetchFoodInfo(undefined, barcode.trim(), country);
                }}
                className="flex flex-col gap-4"
              >
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={barcode}
                  maxLength={13}
                  placeholder="Enter 13-digit GTIN barcode"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d{1,13}$/.test(val)) setBarcode(val);
                  }}
                />

                <Button type="submit" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* RESULTS */}
          {foodInfo && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{foodInfo.name}</CardTitle>
                <CardDescription>
                  Calories: {foodInfo.nutrition?.energy_100g || 0} kcal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>Ingredients: {foodInfo.ingredients}</div>
                <div>Allergens: {foodInfo.allergens.join(', ') || 'None'}</div>
              </CardContent>
            </Card>
          )}

          {healthScore && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div>Score: {healthScore.score}</div>
                <div>Grade: {healthScore.grade}</div>
                <div>Advice: {healthScore.advice}</div>
              </CardContent>
            </Card>
          )}

          {notFound && (
            <div className="mt-6 text-center text-muted-foreground">
              Food not found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
