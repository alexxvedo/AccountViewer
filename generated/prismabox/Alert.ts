import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const AlertPlain = t.Object(
  {
    id: t.String(),
    userId: t.String(),
    accountId: t.String(),
    type: t.String(),
    condition: t.String(),
    value: t.Number(),
    active: t.Boolean(),
    triggered: t.Boolean(),
    lastTriggeredAt: __nullable__(t.Date()),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  },
  { additionalProperties: false },
);

export const AlertRelations = t.Object(
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
        telegramChatId: __nullable__(t.String()),
        telegramConnectionToken: __nullable__(t.String()),
      },
      { additionalProperties: false },
    ),
    account: t.Object(
      {
        id: t.String(),
        userId: t.String(),
        sectionId: __nullable__(t.String()),
        accountTypeId: __nullable__(t.String()),
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
        snapshotted: t.Boolean(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const AlertPlainInputCreate = t.Object(
  {
    type: t.String(),
    condition: t.String(),
    value: t.Number(),
    active: t.Optional(t.Boolean()),
    triggered: t.Optional(t.Boolean()),
    lastTriggeredAt: t.Optional(__nullable__(t.Date())),
  },
  { additionalProperties: false },
);

export const AlertPlainInputUpdate = t.Object(
  {
    type: t.Optional(t.String()),
    condition: t.Optional(t.String()),
    value: t.Optional(t.Number()),
    active: t.Optional(t.Boolean()),
    triggered: t.Optional(t.Boolean()),
    lastTriggeredAt: t.Optional(__nullable__(t.Date())),
  },
  { additionalProperties: false },
);

export const AlertRelationsInputCreate = t.Object(
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

export const AlertRelationsInputUpdate = t.Partial(
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

export const AlertWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          userId: t.String(),
          accountId: t.String(),
          type: t.String(),
          condition: t.String(),
          value: t.Number(),
          active: t.Boolean(),
          triggered: t.Boolean(),
          lastTriggeredAt: t.Date(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Alert" },
  ),
);

export const AlertWhereUnique = t.Recursive(
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
              userId: t.String(),
              accountId: t.String(),
              type: t.String(),
              condition: t.String(),
              value: t.Number(),
              active: t.Boolean(),
              triggered: t.Boolean(),
              lastTriggeredAt: t.Date(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Alert" },
);

export const AlertSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      userId: t.Boolean(),
      accountId: t.Boolean(),
      type: t.Boolean(),
      condition: t.Boolean(),
      value: t.Boolean(),
      active: t.Boolean(),
      triggered: t.Boolean(),
      lastTriggeredAt: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      user: t.Boolean(),
      account: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const AlertInclude = t.Partial(
  t.Object(
    { user: t.Boolean(), account: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const AlertOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      userId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      accountId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      type: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      condition: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      value: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      active: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      triggered: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      lastTriggeredAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
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

export const Alert = t.Composite([AlertPlain, AlertRelations], {
  additionalProperties: false,
});

export const AlertInputCreate = t.Composite(
  [AlertPlainInputCreate, AlertRelationsInputCreate],
  { additionalProperties: false },
);

export const AlertInputUpdate = t.Composite(
  [AlertPlainInputUpdate, AlertRelationsInputUpdate],
  { additionalProperties: false },
);
