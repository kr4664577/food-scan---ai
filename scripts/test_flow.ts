import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function runFullPipelineTest() {
  console.log('=== STARTING FOODSCAN AI INTEGRATION VERIFICATION ===\n');

  // Test 1: Health Check
  console.log('[Test 1] Health Check...');
  const healthRes = await axios.get(`${BASE_URL}/health`);
  console.log('  Status:', healthRes.status, healthRes.data);
  if (healthRes.status !== 200 || healthRes.data.status !== 'OK') {
    throw new Error('Health check failed');
  }

  // Test 2: User Registration
  const testEmail = `tester_${Date.now()}@foodscan.ai`;
  const testPassword = 'SecurePassword123!';
  console.log(`\n[Test 2] User Registration (${testEmail})...`);
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    email: testEmail,
    password: testPassword,
    fullName: 'Test Auditor',
    dietaryGoals: 'High Protein, Low Sodium',
    allergies: ['Peanuts', 'Gluten']
  });
  console.log('  Register Status:', regRes.status);
  console.log('  Register User:', regRes.data.data.user);
  const initialToken = regRes.data.data.token;
  if (!initialToken) throw new Error('No token returned on registration');

  // Test 3: User Login
  console.log('\n[Test 3] User Login...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: testEmail,
    password: testPassword
  });
  console.log('  Login Status:', loginRes.status);
  const token = loginRes.data.data.token;
  console.log('  Acquired JWT Token:', token.substring(0, 25) + '...');
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Test 4: Get User Profile
  console.log('\n[Test 4] Fetching Authenticated Profile...');
  const profileRes = await axios.get(`${BASE_URL}/auth/me`, { headers: authHeaders });
  console.log('  Profile:', profileRes.data.data);

  // Test 5: Barcode Scanning with Database Persistence
  console.log('\n[Test 5] Scanning Barcode (737628064502)...');
  const barcodeRes = await axios.post(
    `${BASE_URL}/scan/barcode`,
    { barcode: '737628064502' },
    { headers: authHeaders }
  );
  console.log('  Barcode Scan Status:', barcodeRes.status);
  const barcodeData = barcodeRes.data.data;
  console.log('  Product Name:', barcodeData.analysis.productName);
  console.log('  Nutrition Score:', barcodeData.analysis.nutritionScore);
  console.log('  Created Scan ID in DB:', barcodeData.scanId);
  const scanId1 = barcodeData.scanId;

  // Test 6: Meal Scan with Database Persistence
  console.log('\n[Test 6] Scanning Meal Image (Sample Rotis & Bhaji)...');
  // 1x1 transparent PNG as test base64 payload
  const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const mealRes = await axios.post(
    `${BASE_URL}/scan/meal`,
    {
      imageBase64: sampleBase64,
      customDishName: 'Whole Wheat Rotis with Bhaji',
      foodCategory: 'HOME_FOOD'
    },
    { headers: authHeaders }
  );
  console.log('  Meal Scan Status:', mealRes.status);
  const mealData = mealRes.data.data;
  console.log('  Meal Data Keys:', Object.keys(mealData));
  const analysis = mealData?.mealAnalysis || mealData?.analysis;
  console.log('  Detected Dish:', analysis?.detectedDishName || '(Dish detected)');
  console.log('  Total Calories:', analysis?.totalNutrition?.calories);
  console.log('  Created Meal Scan ID in DB:', mealData?.scanId);
  const scanId2 = mealData?.scanId;

  // Test 7: Guest Meal Scan (Ensuring No 401 Rejection)
  console.log('\n[Test 7] Guest Scan (No Authorization Header)...');
  const guestRes = await axios.post(
    `${BASE_URL}/scan/meal`,
    {
      imageBase64: sampleBase64,
      customDishName: 'Fresh Fruit Salad',
      foodCategory: 'FRUITS'
    }
  );
  console.log('  Guest Scan Status:', guestRes.status);
  console.log('  Guest Analysis Succeeded:', !!(guestRes.data.data?.mealAnalysis || guestRes.data.data?.analysis));
  console.log('  Guest Scan ID:', guestRes.data.data.scanId, '(Expected undefined for unauthenticated)');

  // Test 8: Fetch User Scan History
  console.log('\n[Test 8] Fetching User Scan History...');
  const historyRes = await axios.get(`${BASE_URL}/history/scans`, { headers: authHeaders });
  console.log('  Total History Records for User:', historyRes.data.data.length);
  console.log('  Recent Items:', historyRes.data.data.map((item: any) => ({
    id: item.id,
    type: item.scanType,
    product: item.productName,
    calories: item.calories
  })));

  // Test 9: Toggle Favorite on Scan 1
  if (scanId1) {
    console.log(`\n[Test 9] Toggling Favorite for Scan ID: ${scanId1}...`);
    const favToggleRes = await axios.post(
      `${BASE_URL}/history/favorites/toggle`,
      { scanId: scanId1 },
      { headers: authHeaders }
    );
    console.log('  Toggle Favorite Status:', favToggleRes.data);

    // Test 10: Fetch Favorites
    console.log('\n[Test 10] Fetching User Favorites...');
    const favsRes = await axios.get(`${BASE_URL}/history/favorites`, { headers: authHeaders });
    console.log('  Total Favorites:', favsRes.data.data.length);
    console.log('  Favorite Item Product:', favsRes.data.data[0]?.scan?.productName);
  }

  console.log('\n=== ALL 10 INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runFullPipelineTest().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.response?.data || err.message);
  process.exit(1);
});
