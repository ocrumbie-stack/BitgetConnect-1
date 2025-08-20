export interface BitgetCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

export interface FuturesTickerResponse {
  symbol: string;
  lastPr: string;
  chgUTC: string;
  chg24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  nextFundingTime: string;
}

export interface AccountResponse {
  marginCoin: string;
  available: string;
  crossMaxAvailable: string;
  fixedMaxAvailable: string;
  maxTransferOut: string;
  equity: string;
  usdtEquity: string;
  btcEquity: string;
  crossRiskRate: string;
  unrealizedPL: string;
  bonus: string;
}

export interface PositionResponse {
  marginCoin: string;
  symbol: string;
  holdSide: string;
  openDelegateSize: string;
  marginSize: string;
  available: string;
  locked: string;
  total: string;
  leverage: string;
  achievedProfits: string;
  unrealizedPL: string;
  marginMode: string;
  posMode: string;
  unrealizedPLR: string;
  breakEvenPrice: string;
  markPrice: string;
  indexPrice: string;
  marginRatio: string;
  maintenanceMargin: string;
  initialMargin: string;
  holdMode: string;
  cTime: string;
  uTime: string;
}

export interface WebSocketMessage {
  type: 'futuresUpdate' | 'accountUpdate' | 'positionUpdate' | 'error';
  data: any;
  timestamp?: string;
}

export interface ApiStatus {
  apiConnected: boolean;
  lastUpdate: string;
  error?: string;
}
