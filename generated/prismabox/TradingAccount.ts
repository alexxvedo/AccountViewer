import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TradingAccountPlain = t.Object(
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
);

export const TradingAccountRelations = t.Object(
  {
    user: t.Object(
      {
        id: t.String(),
        email: t.String(),
        name: __nullable__(t.String()),
        emailVerified: t.Boolean(),
        image: __nullable__(t.String()),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      },
      { additionalProperties: false },
    ),
    section: __nullable__(
      t.Object(
        {
          id: t.String(),
          userId: t.String(),
          name: t.String(),
          color: __nullable__(t.String()),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    ),
    trades: t.Array(
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
      ),
      { additionalProperties: false },
    ),
    snapshots: t.Array(
      t.Object(
        {
          id: t.String(),
          accountId: t.String(),
          balance: t.Number(),
          equity: t.Number(),
          margin: t.Number(),
          freeMargin: t.Number(),
          marginLevel: __nullable__(t.Number()),
          openPositions: t.Integer(),
          timestamp: t.Date(),
        },
        { additionalProperties: false },
      ),
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const TradingAccountPlainInputCreate = t.Object(
  {
    connectionToken: t.Optional(t.String()),
    accountNumber: t.Integer(),
    broker: t.String(),
    server: t.String(),
    platform: t.Optional(t.String()),
    nickname: t.Optional(__nullable__(t.String())),
    isConnected: t.Optional(t.Boolean()),
    lastSeen: t.Optional(__nullable__(t.Date())),
    balance: t.Optional(t.Number()),
    equity: t.Optional(t.Number()),
  },
  { additionalProperties: false },
);

export const TradingAccountPlainInputUpdate = t.Object(
  {
    connectionToken: t.Optional(t.String()),
    accountNumber: t.Optional(t.Integer()),
    broker: t.Optional(t.String()),
    server: t.Optional(t.String()),
    platform: t.Optional(t.String()),
    nickname: t.Optional(__nullable__(t.String())),
    isConnected: t.Optional(t.Boolean()),
    lastSeen: t.Optional(__nullable__(t.Date())),
    balance: t.Optional(t.Number()),
    equity: t.Optional(t.Number()),
  },
  { additionalProperties: false },
);

export const TradingAccountRelationsInputCreate = t.Object(
  {
    user: t.Object(
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
    section: t.Optional(
      t.Object(
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
    ),
    trades: t.Optional(
      t.Object(
        {
          connect: t.Array(
            t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
    snapshots: t.Optional(
      t.Object(
        {
          connect: t.Array(
            t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const TradingAccountRelationsInputUpdate = t.Partial(
  t.Object(
    {
      user: t.Object(
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
      section: t.Partial(
        t.Object(
          {
            connect: t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            disconnect: t.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
      trades: t.Partial(
        t.Object(
          {
            connect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
            disconnect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
      ),
      snapshots: t.Partial(
        t.Object(
          {
            connect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
            disconnect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export const TradingAccountWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          userId: t.String(),
          sectionId: t.String(),
          connectionToken: t.String(),
          accountNumber: t.Integer(),
          broker: t.String(),
          server: t.String(),
          platform: t.String(),
          nickname: t.String(),
          isConnected: t.Boolean(),
          lastSeen: t.Date(),
          balance: t.Number(),
          equity: t.Number(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "TradingAccount" },
  ),
);

export const TradingAccountWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String(), connectionToken: t.String() },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [
            t.Object({ id: t.String() }),
            t.Object({ connectionToken: t.String() }),
          ],
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
              userId: t.String(),
              sectionId: t.String(),
              connectionToken: t.String(),
              accountNumber: t.Integer(),
              broker: t.String(),
              server: t.String(),
              platform: t.String(),
              nickname: t.String(),
              isConnected: t.Boolean(),
              lastSeen: t.Date(),
              balance: t.Number(),
              equity: t.Number(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "TradingAccount" },
);

export const TradingAccountSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      userId: t.Boolean(),
      sectionId: t.Boolean(),
      connectionToken: t.Boolean(),
      accountNumber: t.Boolean(),
      broker: t.Boolean(),
      server: t.Boolean(),
      platform: t.Boolean(),
      nickname: t.Boolean(),
      isConnected: t.Boolean(),
      lastSeen: t.Boolean(),
      balance: t.Boolean(),
      equity: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      user: t.Boolean(),
      section: t.Boolean(),
      trades: t.Boolean(),
      snapshots: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TradingAccountInclude = t.Partial(
  t.Object(
    {
      user: t.Boolean(),
      section: t.Boolean(),
      trades: t.Boolean(),
      snapshots: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TradingAccountOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      userId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      sectionId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      connectionToken: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      accountNumber: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      broker: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      server: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      platform: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      nickname: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      isConnected: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      lastSeen: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      balance: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      equity: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      updatedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const TradingAccount = t.Composite(
  [TradingAccountPlain, TradingAccountRelations],
  { additionalProperties: false },
);

export const TradingAccountInputCreate = t.Composite(
  [TradingAccountPlainInputCreate, TradingAccountRelationsInputCreate],
  { additionalProperties: false },
);

export const TradingAccountInputUpdate = t.Composite(
  [TradingAccountPlainInputUpdate, TradingAccountRelationsInputUpdate],
  { additionalProperties: false },
);
