import BigNumber from "bignumber.js";
import request, { gql } from "graphql-request";
import { FetchOptions, SimpleAdapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";

const endpoint =
  "https://api.goldsky.com/api/public/project_cm0qvthsz96sp01utcnk55ib0/subgraphs/filament-sei/v3/gn";

// Get timestamps for yesterday and today
const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
const yesterday = now - 86400; // 24 hours ago

const queryDaily = gql`
  query stats($yesterday: Int!, $now: Int!) {
    totalTradingFees(
      orderBy: block_number
      orderDirection: asc
      where: { timestamp__gte: $yesterday, timestamp__lte: $now }
    ) {
      timestamp_
      block_number
      account
      totalFees
    }
  }
`;

const queryTotal = gql`
  query stats {
    totalTradingFees(orderBy: block_number, orderDirection: asc) {
      timestamp_
      block_number
      account
      totalFees
    }
  }
`;

interface IGraphResponse {
  totalTradingFees: Array<{
    timestamp: string;
    blocknumber: string;
    account: string;
    totalFees: string;
  }>;
}

const methodology = {
  totalFees:
    "Tracks the cumulative fees (borrowing fees + trading fees) generated by all transactions.",
  dailyFees:
    "Tracks the fees (borrowing fees + trading fees) generated by transactions on a daily basis.",
};

const toString = (x: BigNumber) => {
  if (x.isEqualTo(0)) return undefined;
  return x.toString();
};

const fetchProtocolFees = async () => {
  // Fetch daily fees
  console.log(now);
  const yesterday = now - 86400; // 24 hours ago
  console.log(yesterday);
  const responseDaily: IGraphResponse = await request(endpoint, queryDaily, {
    yesterday,
    now,
  });

  let dailyFees = new BigNumber(0);
  responseDaily.totalTradingFees.forEach((data) => {
    dailyFees = dailyFees.plus(new BigNumber(data.totalFees));
  });

  // Fetch total fees
  const responseTotal: IGraphResponse = await request(endpoint, queryTotal);

  let totalFees = new BigNumber(0);
  responseTotal.totalTradingFees.forEach((data) => {
    totalFees = totalFees.plus(new BigNumber(data.totalFees));
  });

  dailyFees = dailyFees.dividedBy(new BigNumber(1e18));
  totalFees = totalFees.dividedBy(new BigNumber(1e18));

  const _dailyFees = toString(dailyFees);
  const _totalFees = toString(totalFees);

  return {
    dailyFees: _dailyFees ?? "0",
    totalFees: _totalFees ?? "0",
  };
};

const adapter: SimpleAdapter = {
  adapter: {
    [CHAIN.SEI]: {
      fetch: fetchProtocolFees,
      start: '2025-01-21',
      meta: {
        methodology,
      },
    },
  },
};
export default adapter;
