const { SUBSCRIPTION_TIERS } = require('../../config/subscription.config');

describe('SUBSCRIPTION_TIERS configuration', () => {
  test('defines starter, business, pro, and enterprise tiers', () => {
    expect(SUBSCRIPTION_TIERS).toHaveProperty('starter');
    expect(SUBSCRIPTION_TIERS).toHaveProperty('business');
    expect(SUBSCRIPTION_TIERS).toHaveProperty('pro');
    expect(SUBSCRIPTION_TIERS).toHaveProperty('enterprise');
  });

  test('starter tier has correct employee limit and is a trial', () => {
    expect(SUBSCRIPTION_TIERS.starter.employeeLimit).toBe(20);
    expect(SUBSCRIPTION_TIERS.starter.isTrial).toBe(true);
    expect(SUBSCRIPTION_TIERS.starter.price).toBe(0);
  });

  test('business tier supports up to 30 employees at $29', () => {
    expect(SUBSCRIPTION_TIERS.business.employeeLimit).toBe(30);
    expect(SUBSCRIPTION_TIERS.business.price).toBe(29);
  });

  test('pro tier supports up to 50 employees at $59', () => {
    expect(SUBSCRIPTION_TIERS.pro.employeeLimit).toBe(50);
    expect(SUBSCRIPTION_TIERS.pro.price).toBe(59);
  });

  test('enterprise tier has unlimited employees (999999) at $149', () => {
    expect(SUBSCRIPTION_TIERS.enterprise.employeeLimit).toBe(999999);
    expect(SUBSCRIPTION_TIERS.enterprise.price).toBe(149);
  });

  test('every tier has a non-empty features array', () => {
    for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
      expect(Array.isArray(tier.features)).toBe(true);
      expect(tier.features.length).toBeGreaterThan(0);
    }
  });

  test('every tier has a human-readable name', () => {
    for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
      expect(typeof tier.name).toBe('string');
      expect(tier.name.length).toBeGreaterThan(0);
    }
  });
});
