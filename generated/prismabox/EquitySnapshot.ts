import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const EquitySnapshotPlain = t.Object(
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
);

export const EquitySnapshotRelations = t.Object(
  {
    account: t.Object(
      {
        id: t.String(),
        userId: t.String(),
        connectionToken: t.String(),
        accountNumber: t.Integer(),
        broker: t.String(),
        server: t.String(),
        platform: t.String(),
        nickname: __nullable__(t.String()),
        isConnected: t.Boolean(),
        lastSeen: __nullable__(t.Date()),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const EquitySnapshotPlainInputCreate = t.Object(
  {
    balance: t.Number(),
    equity: t.Number(),
    margin: t.Number(),
    freeMargin: t.Number(),
    marginLevel: t.Optional(__nullable__(t.Number())),
    openPositions: t.Optional(t.Integer()),
    timestamp: t.Optional(t.Date()),
  },
  { additionalProperties: false },
);

export const EquitySnapshotPlainInputUpdate = t.Object(
  {
    balance: t.Optional(t.Number()),
    equity: t.Optional(t.Number()),
    margin: t.Optional(t.Number()),
    freeMargin: t.Optional(t.Number()),
    marginLevel: t.Optional(__nullable__(t.Number())),
    openPositions: t.Optional(t.Integer()),
    timestamp: t.Optional(t.Date()),
  },
  { additionalProperties: false },
);

export const EquitySnapshotRelationsInputCreate = t.Object(
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

export const EquitySnapshotRelationsInputUpdate = t.Partial(
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

export const EquitySnapshotWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          accountId: t.String(),
          balance: t.Number(),
          equity: t.Number(),
          margin: t.Number(),
          freeMargin: t.Number(),
          marginLevel: t.Number(),
          openPositions: t.Integer(),
          timestamp: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "EquitySnapshot" },
  ),
);

export const EquitySnapshotWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object({ id: t.String() }, { additionalProperties: false }),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ id: t.String() })], {
          additionalProperties: false,
        }),
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
              balance: t.Number(),
              equity: t.Number(),
              margin: t.Number(),
              freeMargin: t.Number(),
              marginLevel: t.Number(),
              openPositions: t.Integer(),
              timestamp: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "EquitySnapshot" },
);

export const EquitySnapshotSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      accountId: t.Boolean(),
      balance: t.Boolean(),
      equity: t.Boolean(),
      margin: t.Boolean(),
      freeMargin: t.Boolean(),
      marginLevel: t.Boolean(),
      openPositions: t.Boolean(),
      timestamp: t.Boolean(),
      account: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const EquitySnapshotInclude = t.Partial(
  t.Object(
    { account: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const EquitySnapshotOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      accountId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      balance: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      equity: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      margin: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      freeMargin: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      marginLevel: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      openPositions: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      timestamp: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const EquitySnapshot = t.Composite(
  [EquitySnapshotPlain, EquitySnapshotRelations],
  { additionalProperties: false },
);

export const EquitySnapshotInputCreate = t.Composite(
  [EquitySnapshotPlainInputCreate, EquitySnapshotRelationsInputCreate],
  { additionalProperties: false },
);

export const EquitySnapshotInputUpdate = t.Composite(
  [EquitySnapshotPlainInputUpdate, EquitySnapshotRelationsInputUpdate],
  { additionalProperties: false },
);
