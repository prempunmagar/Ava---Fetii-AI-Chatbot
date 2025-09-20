/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    SNOWFLAKE_PAT_TOKEN: process.env.SNOWFLAKE_PAT_TOKEN,
    SNOWFLAKE_ACCOUNT: process.env.SNOWFLAKE_ACCOUNT,
    AGENT_NAME: process.env.AGENT_NAME,
    DATABASE: process.env.DATABASE,
    SCHEMA: process.env.SCHEMA,
  }
}

module.exports = nextConfig