export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly fullName: string,
    public readonly email?: string,
    public readonly phoneNumber?: string,
  ) {}
}
