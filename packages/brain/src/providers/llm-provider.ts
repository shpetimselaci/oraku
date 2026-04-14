export abstract class LLMProvider<TConfig extends { apiKey: string; model: string }> {

    public abstract complete <T>(...args: any[]): Promise<T>;
    public consume <T>(...args: any[]): Promise<T> {
        return this.complete<T>(args[0], args[1])
    }
    abstract setup(config: TConfig): void;

    constructor(readonly name: string, readonly config: TConfig) {
        this.setup(config);
    }

}