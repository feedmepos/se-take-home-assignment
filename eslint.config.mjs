import nextConfig from 'eslint-config-next';
import nextTypeScriptConfig from 'eslint-config-next/typescript';

const eslintConfig = [...nextConfig, ...nextTypeScriptConfig];

export default eslintConfig;
