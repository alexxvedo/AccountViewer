import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TradeHistoryPlain = t.Object(
  {
    id: t.String(),
    accountId: t.String(),
    ticket: t.Integer(),
    symbol: t.String(),
    type: t.String(),
    volume: t.Number(),
    openPrice: t.Number(),
    closePrice: t.Number(),
    stopLoss: __nullable__(t.Number()),
    takeProfit: __nullable__(t.Number()),
    profit: t.Number(),
    swap: t.Number(),
    commission: t.Number(),
    openTime: t.Date(),
    closeTime: t.Date(),
    comment: __nullable__(t.String()),
    magicNumber: __nullable__(t.Integer()),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const TradeHistoryRelations = t.Object(
  {
    account: t.Object(
      {
        id: t.String(),
        userId: t.String(),
        sectionId: __nullable__(t.String()),
        connectionToken: t.String(),
        accountNumber: t.Integer(),
        broker: t.String(),
        server: t.String(),
        platform: t.String(),
        nickname: __nullable__(t.String()),
        isConnected: t.Boolean(),
        lastSeen: __nullable__(t.Date()),
        balance: t.Number(),
        equity: t.Number(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const TradeHistoryPlainInputCreate = t.Object(
  {
    ticket: t.Integer(),
    symbol: t.String(),
    type: t.String(),
    volume: t.Number(),
    openPrice: t.Number(),
    closePrice: t.Number(),
    stopLoss: t.Optional(__nullable__(t.Number())),
    takeProfit: t.Optional(__nullable__(t.Number())),
    profit: t.Number(),
    swap: t.Optional(t.Number()),
    commission: t.Optional(t.Number()),
    openTime: t.Date(),
    closeTime: t.Date(),
    comment: t.Optional(__nullable__(t.String())),
    magicNumber: t.Optional(__nullable__(t.Integer())),
  },
  { additionalProperties: false },
);

export const TradeHistoryPlainInputUpdate = t.Object(
  {
    ticket: t.Optional(t.Integer()),
    symbol: t.Optional(t.String()),
    type: t.Optional(t.String()),
    volume: t.Optional(t.Number()),
    openPrice: t.Optional(t.Number()),
    closePrice: t.Optional(t.Number()),
    stopLoss: t.Optional(__nullable__(t.Number())),
    takeProfit: t.Optional(__nullable__(t.Number())),
    profit: t.Optional(t.Number()),
    swap: t.Optional(t.Number()),
    commission: t.Optional(t.Number()),
    openTime: t.Optional(t.Date()),
    closeTime: t.Optional(t.Date()),
    comment: t.Optional(__nullable__(t.String())),
    magicNumber: t.Optional(__nullable__(t.Integer())),
  },
  { additionalProperties: false },
);

export const TradeHistoryRelationsInputCreate = t.Object(
  {
    account: t.Object(
      {
        connect: t.Object(
          {
            id: t.String({ additionalProperties: false }),
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const TradeHistoryRelationsInputUpdate = t.Partial(
  t.Object(
    {
      account: t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);

export const TradeHistoryWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          accountId: t.String(),
          ticket: t.Integer(),
          symbol: t.String(),
          type: t.String(),
          volume: t.Number(),
          openPrice: t.Number(),
          closePrice: t.Number(),
          stopLoss: t.Number(),
          takeProfit: t.Number(),
          profit: t.Number(),
          swap: t.Number(),
          commission: t.Number(),
          openTime: t.Date(),
          closeTime: t.Date(),
          comment: t.String(),
          magicNumber: t.Integer(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "TradeHistory" },
  ),
);

export const TradeHistoryWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String(), ticket: t.Integer() },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [t.Object({ id: t.String() }), t.Object({ ticket: t.Integer() })],
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object({
            AND: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            NOT: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            OR: t.Array(Self, { additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object(
            {
              id: t.String(),
              accountId: t.String(),
              ticket: t.Integer(),
              symbol: t.String(),
              type: t.String(),
              volume: t.Number(),
              openPrice: t.Number(),
              closePrice: t.Number(),
              stopLoss: t.Number(),
              takeProfit: t.Number(),
              profit: t.Number(),
              swap: t.Number(),
              commission: t.Number(),
              openTime: t.Date(),
              closeTime: t.Date(),
              comment: t.String(),
              magicNumber: t.Integer(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "TradeHistory" },
);

export const TradeHistorySelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      accountId: t.Boolean(),
      ticket: t.Boolean(),
      symbol: t.Boolean(),
      type: t.Boolean(),
      volume: t.Boolean(),
      openPrice: t.Boolean(),
      closePrice: t.Boolean(),
      stopLoss: t.Boolean(),
      takeProfit: t.Boolean(),
      profit: t.Boolean(),
      swap: t.Boolean(),
      commission: t.Boolean(),
      openTime: t.Boolean(),
      closeTime: t.Boolean(),
      comment: t.Boolean(),
      magicNumber: t.Boolean(),
      createdAt: t.Boolean(),
      account: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TradeHistoryInclude = t.Partial(
  t.Object(
    { account: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const TradeHistoryOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      accountId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      ticket: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      symbol: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      type: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      volume: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      openPrice: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      closePrice: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      stopLoss: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      takeProfit: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      profit: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      swap: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      commission: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      openTime: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      closeTime: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      comment: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      magicNumber: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const TradeHistory = t.Composite(
  [TradeHistoryPlain, TradeHistoryRelations],
  { additionalProperties: false },
);

export const TradeHistoryInputCreate = t.Composite(
  [TradeHistoryPlainInputCreate, TradeHistoryRelationsInputCreate],
  { additionalProperties: false },
);

export const TradeHistoryInputUpdate = t.Composite(
  [TradeHistoryPlainInputUpdate, TradeHistoryRelationsInputUpdate],
  { additionalProperties: false },
);
