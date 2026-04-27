# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Admin E2E Flow >> Order Cleanup UI
- Location: tests\e2e.spec.ts:90:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '📋 Orders' })

```

# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e7]:
          - button "previous" [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - button "next" [disabled] [ref=e11]:
            - img "next" [ref=e12]
          - generic [ref=e14]: 1 of 1 error
          - generic [ref=e15]:
            - text: Next.js (14.2.5) is outdated
            - link "(learn more)" [ref=e17] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e18] [cursor=pointer]:
          - img [ref=e20]
      - heading "Unhandled Runtime Error" [level=1] [ref=e23]
      - paragraph [ref=e24]: "TypeError: Cannot read properties of undefined (reading 'length')"
    - generic [ref=e25]:
      - heading "Source" [level=2] [ref=e26]
      - generic [ref=e27]:
        - link "app\\admin\\page.tsx (577:35) @ length" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: app\admin\page.tsx (577:35) @ length
          - img [ref=e31]
        - generic [ref=e35]: "575 | Today's Picking List 576 | </h3> > 577 | {stats.itemTotals.length === 0 ? ( | ^ 578 | <p className=\"text-gray-500 text-sm\">No orders today yet.</p> 579 | ) : ( 580 | <div className=\"space-y-3\">"
      - heading "Call Stack" [level=2] [ref=e36]
      - button "Show collapsed frames" [ref=e37] [cursor=pointer]
```

# Test source

```ts
  10  |         { id: 1, name: 'Apple', emoji: '🍎', price: 1.5, unit: 'kg', stock: 10, maxPerOrder: 5, active: true }
  11  |       ];
  12  |       await route.fulfill({ json });
  13  |     });
  14  | 
  15  |     // Mock config API
  16  |     await page.route('**/api/config*', async (route) => {
  17  |       const json = { haltStore: false, showUrgency: true, allowCustomerCancellation: true };
  18  |       await route.fulfill({ json });
  19  |     });
  20  | 
  21  |     await page.goto('/order');
  22  |     
  23  |     // Check elements
  24  |     await expect(page.getByText('Apple')).toBeVisible();
  25  |     await expect(page.getByText('£1.50')).toBeVisible();
  26  | 
  27  |     // Try clicking plus
  28  |     await page.getByRole('button', { name: '+' }).click();
  29  |     await expect(page.getByText('Total: £1.50')).toBeVisible();
  30  | 
  31  |     // Try checkout without details
  32  |     await page.getByRole('button', { name: 'Checkout' }).click();
  33  |     
  34  |     // Fill details
  35  |     await page.getByPlaceholder('Name').fill('John Doe');
  36  |     await page.getByPlaceholder('Email').fill('john@example.com');
  37  |     await page.getByPlaceholder('Phone').fill('1234567890');
  38  |     
  39  |     // Mock checkout API
  40  |     await page.route('**/api/orders*', async (route) => {
  41  |       await route.fulfill({ json: { success: true, orderNumber: 'ORD-123' } });
  42  |     });
  43  | 
  44  |     await page.getByRole('button', { name: 'Confirm Order' }).click();
  45  |     await expect(page.getByText('Thank You!')).toBeVisible();
  46  |   });
  47  | });
  48  | 
  49  | test.describe('Admin E2E Flow', () => {
  50  |   test('Login and navigate dashboard', async ({ page }) => {
  51  |     // Mock check auth to simulate not logged in
  52  |     await page.route('**/api/auth/check*', async (route) => {
  53  |       await route.fulfill({ status: 401 });
  54  |     });
  55  | 
  56  |     await page.goto('/admin/login');
  57  |     
  58  |     // Fill OTP bypass (test) or mock auth
  59  |     await page.route('**/api/auth/login*', async (route) => {
  60  |       await route.fulfill({ json: { success: true } });
  61  |     });
  62  | 
  63  |     // Mock dashboard data
  64  |     await page.route('/api/admin/orders*', async (route) => {
  65  |       await route.fulfill({ json: [
  66  |         { id: '1', orderNumber: 'ORD-111', name: 'Alice', status: 'pending', totalAmount: 10, createdAt: new Date().toISOString() }
  67  |       ]});
  68  |     });
  69  |     await page.route('/api/admin/products*', async (route) => {
  70  |       await route.fulfill({ json: []});
  71  |     });
  72  |     await page.route('/api/admin/stats*', async (route) => {
  73  |       await route.fulfill({ json: { totalOrders: 1, pendingOrders: 1, revenue: 10, dailyRevenue: [] }});
  74  |     });
  75  |     await page.route('/api/admin/audit*', async (route) => {
  76  |       await route.fulfill({ json: []});
  77  |     });
  78  |     await page.route('/api/admin/settings*', async (route) => {
  79  |       await route.fulfill({ json: {}});
  80  |     });
  81  | 
  82  |     await page.getByPlaceholder('Admin Password').fill('mockpassword');
  83  |     await page.getByRole('button', { name: 'Login' }).click();
  84  | 
  85  |     // Should redirect to dashboard and show stats
  86  |     await expect(page.getByText('Pending Orders')).toBeVisible();
  87  |     await expect(page.getByText('ORD-111')).toBeVisible();
  88  |   });
  89  | 
  90  |   test('Order Cleanup UI', async ({ page }) => {
  91  |     await page.route('/api/admin/orders*', async (route) => {
  92  |       await route.fulfill({ json: []});
  93  |     });
  94  |     await page.route('/api/admin/products*', async (route) => {
  95  |       await route.fulfill({ json: []});
  96  |     });
  97  |     await page.route('/api/admin/stats*', async (route) => {
  98  |       await route.fulfill({ json: { totalOrders: 0 }});
  99  |     });
  100 |     await page.route('/api/admin/audit*', async (route) => {
  101 |       await route.fulfill({ json: []});
  102 |     });
  103 |     await page.route('/api/admin/settings*', async (route) => {
  104 |       await route.fulfill({ json: {}});
  105 |     });
  106 | 
  107 |     await page.goto('/admin');
  108 |     
  109 |     // Go to orders tab
> 110 |     await page.getByRole('button', { name: '📋 Orders' }).click();
      |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  111 |     
  112 |     // Click clear old orders
  113 |     await page.getByRole('button', { name: 'Clear Old Orders' }).first().click();
  114 |     
  115 |     // Check modal
  116 |     await expect(page.getByText('Clear Old Orders').nth(1)).toBeVisible();
  117 |     
  118 |     // Check validation
  119 |     await page.locator('input[type="number"]').fill('1'); // Wrong captcha
  120 |     await page.route('**/api/admin/orders/cleanup*', async (route) => {
  121 |       await route.fulfill({ json: { deletedCount: 5, csvData: 'mock' } });
  122 |     });
  123 | 
  124 |     // The frontend prevents submission if math is wrong, so we just expect the math question to exist
  125 |     await expect(page.getByText('Security Check:')).toBeVisible();
  126 |   });
  127 | });
  128 | 
```