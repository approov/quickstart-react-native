export declare class ApproovService {
    static initialize(config: string): Promise<void>;
    static setProceedOnNetworkFail(): void;
    static setSuppressLoggingUnknownURL(): void;
    static setTokenHeader(header: string, prefix: string): void;
    static setBindingHeader(header: string): void;
    static addSubstitutionHeader(header: string, requiredPrefix: string): void;
    static removeSubstitutionHeader(header: string): void;
    static addSubstitutionQueryParam(key: string): void;
    static removeSubstitutionQueryParam(key: string): void;
    static addExclusionURLRegex(urlRegex: string): void;
    static removeExclusionURLRegex(urlRegex: string): void;
    static prefetch(): void;
    static precheck(): Promise<void>;
    static getDeviceID(): Promise<String>;
    static setDataHashInToken(data: string): Promise<void>;
    static fetchToken(url: string): Promise<String>;
    static getMessageSignature(message: string): Promise<String>;
    static fetchSecureString(key: string, newDef: string): Promise<String>;
    static fetchCustomJWT(payload: string): Promise<String>;
  }
import { ApproovProvider } from "./approov-provider";
import { ApproovMonitor } from "./approov-monitor";
import { useApproov } from "./approov-provider";
export { ApproovProvider, ApproovMonitor, useApproov };
