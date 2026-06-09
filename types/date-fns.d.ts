declare module "date-fns" {
  export function addDays(date: Date | number | string, amount: number): Date;
  export function differenceInCalendarDays(
    laterDate: Date | number | string,
    earlierDate: Date | number | string,
  ): number;
  export function format(date: Date | number | string, formatStr: string): string;
  export function parseISO(argument: string): Date;
}
