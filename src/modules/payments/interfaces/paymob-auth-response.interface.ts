export interface PaymobAuthResponse {
  token: string;
  profile: {
    id: number;
    user: {
      id: number;
      username: string;
      email: string;
    };
  };
}
