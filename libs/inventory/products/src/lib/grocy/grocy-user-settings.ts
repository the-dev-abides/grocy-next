import { z } from 'zod';

import type { ConsumeSettings } from '../consume-settings.ts';

import { grocyFlag, grocyNumber } from './grocy-answers.ts';

// The answer of `GET /api/user/settings` of Grocy 4.7.1: every setting of the
// user as key and value. The schema reads the two settings of the default
// consume amount. It is loose, because the answer holds every setting.
export const grocyUserSettingsSchema = z.looseObject({
  stock_default_consume_amount: grocyNumber,
  stock_default_consume_amount_use_quick_consume_amount: grocyFlag,
});

type GrocyUserSettings = z.infer<typeof grocyUserSettingsSchema>;

export function toConsumeSettings(
  settings: GrocyUserSettings,
): ConsumeSettings {
  return {
    defaultConsumeAmount: settings.stock_default_consume_amount,
    useQuickConsumeAmount:
      settings.stock_default_consume_amount_use_quick_consume_amount,
  };
}
