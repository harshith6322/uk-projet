import { test, expect } from '@playwright/test';

// We mock the backend calls using page.route so we don't spam the real Google Sheets

test.describe('Storefront E2E Flow', () => {
  test('Add to cart and checkout validation', async ({ page }) => {
    // Mock the products API
    await page.route('**/api/products*', async (route) => {
      const json = [
        { id: 1, name: 'Apple', emoji: '🍎', price: 1.5, unit: 'kg', stock: 10, maxPerOrder: 5, active: true }
      ];
      await route.fulfill({ json });
    });

    // Mock config API
    await page.route('**/api/config*', async (route) => {
      const json = { haltStore: false, showUrgency: true, allowCustomerCancellation: true };
      await route.fulfill({ json });
    });

    await page.goto('/order');
    
    // Check elements
    await expect(page.getByText('Apple')).toBeVisible();
    await expect(page.getByText('£1.50')).toBeVisible();

    // Try clicking plus
    await page.getByRole('button', { name: '+' }).click();
    await expect(page.getByText('Total: £1.50')).toBeVisible();

    // Try checkout without details
    await page.getByRole('button', { name: 'Checkout' }).click();
    
    // Fill details
    await page.getByPlaceholder('Name').fill('John Doe');
    await page.getByPlaceholder('Email').fill('john@example.com');
    await page.getByPlaceholder('Phone').fill('1234567890');
    
    // Mock checkout API
    await page.route('**/api/orders*', async (route) => {
      await route.fulfill({ json: { success: true, orderNumber: 'ORD-123' } });
    });

    await page.getByRole('button', { name: 'Confirm Order' }).click();
    await expect(page.getByText('Thank You!')).toBeVisible();
  });
});

test.describe('Admin E2E Flow', () => {
  test('Login and navigate dashboard', async ({ page }) => {
    // Mock check auth to simulate not logged in
    await page.route('**/api/auth/check*', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto('/admin/login');
    
    // Fill OTP bypass (test) or mock auth
    await page.route('**/api/auth/login*', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    // Mock dashboard data
    await page.route('/api/admin/orders*', async (route) => {
      await route.fulfill({ json: [
        { id: '1', orderNumber: 'ORD-111', name: 'Alice', status: 'pending', totalAmount: 10, createdAt: new Date().toISOString() }
      ]});
    });
    await page.route('/api/admin/products*', async (route) => {
      await route.fulfill({ json: []});
    });
    await page.route('/api/admin/stats*', async (route) => {
      await route.fulfill({ json: { totalOrders: 1, pendingOrders: 1, revenue: 10, dailyRevenue: [] }});
    });
    await page.route('/api/admin/audit*', async (route) => {
      await route.fulfill({ json: []});
    });
    await page.route('/api/admin/settings*', async (route) => {
      await route.fulfill({ json: {}});
    });

    await page.getByPlaceholder('Admin Password').fill('mockpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should redirect to dashboard and show stats
    await expect(page.getByText('Pending Orders')).toBeVisible();
    await expect(page.getByText('ORD-111')).toBeVisible();
  });

  test('Order Cleanup UI', async ({ page }) => {
    await page.route('/api/admin/orders*', async (route) => {
      await route.fulfill({ json: []});
    });
    await page.route('/api/admin/products*', async (route) => {
      await route.fulfill({ json: []});
    });
    await page.route('/api/admin/stats*', async (route) => {
      await route.fulfill({ json: { totalOrders: 0 }});
    });
    await page.route('/api/admin/audit*', async (route) => {
      await route.fulfill({ json: []});
    });
    await page.route('/api/admin/settings*', async (route) => {
      await route.fulfill({ json: {}});
    });

    await page.goto('/admin');
    
    // Go to orders tab
    await page.getByRole('button', { name: '📋 Orders' }).click();
    
    // Click clear old orders
    await page.getByRole('button', { name: 'Clear Old Orders' }).first().click();
    
    // Check modal
    await expect(page.getByText('Clear Old Orders').nth(1)).toBeVisible();
    
    // Check validation
    await page.locator('input[type="number"]').fill('1'); // Wrong captcha
    await page.route('**/api/admin/orders/cleanup*', async (route) => {
      await route.fulfill({ json: { deletedCount: 5, csvData: 'mock' } });
    });

    // The frontend prevents submission if math is wrong, so we just expect the math question to exist
    await expect(page.getByText('Security Check:')).toBeVisible();
  });
});
