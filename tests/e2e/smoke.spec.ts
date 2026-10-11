import { expect, test } from "@playwright/test";

const coreRoutes = [
  { path: "/", label: "home" },
  { path: "/calculator", label: "calculator" },
  { path: "/services", label: "services" },
  { path: "/cases", label: "cases" },
  { path: "/knowledge", label: "knowledge" },
];

for (const route of coreRoutes) {
  test(`core route ${route.label} renders successfully (${route.path})`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response, `No document response for ${route.path}`).not.toBeNull();
    expect(response!.status(), `Unexpected HTTP status for ${route.path}`).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  });
}
