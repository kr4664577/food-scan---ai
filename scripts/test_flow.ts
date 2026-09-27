// Keep the original end-to-end entrypoint, but use the isolated API harness.
// It covers health, signup/login/profile, food/non-food barcode lookup, image
// success/failure, guest scans, history and favorites without real credentials,
// production writes, live provider quota, or printing tokens/account records.
import './test_api_regressions';
