export enum Area {
  PULP2 = 'Pulp 2',
  NPP11 = 'NPP11',
  EWTP = 'E/WTP',
}

export type ViewType =
  | 'dashboard'
  | 'stock'
  | 'stock_abb'
  | 'stock_supcon'
  | 'equipment'
  | 'customer_form'
  | 'customer_form_supcon';