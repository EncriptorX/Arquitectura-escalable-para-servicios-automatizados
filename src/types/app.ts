export type ProcessInfo = {
  urls: string[];
  message: string;
  output?: string;
};

export type CSaaSInfo = {
  subdomain: string;
  protected_url: string;
  origin_urls: string[];
  message: string;
  logs?: string[];
};

export type View =
  | 'home'
  | 'form'
  | 'process'
  | 'control-panel'
  | 'csaas-form'
  | 'csaas-result'
  | 'csaas-clients';
