// The two Grocy user settings of the default consume amount. The Grocy
// consume form reads them. The default consume amount applies when the
// setting for the quick consume amount is off. When it is on, the quick
// consume amount of the product applies.
export interface ConsumeSettings {
  defaultConsumeAmount: number;
  useQuickConsumeAmount: boolean;
}
