import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const AccountTypePlain = t.Object(
  {
    id: t.String(),
    userId: t.String(),
    name: t.String(),
    color: t.String(),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const AccountTypeRelations = t.Object(
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
    accounts: t.Array(
      t.Object(
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
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const AccountTypePlainInputCreate = t.Object(
  { name: t.String(), color: t.Optional(t.String()) },
  { additionalProperties: false },
);

export const AccountTypePlainInputUpdate = t.Object(
  { name: t.Optional(t.String()), color: t.Optional(t.String()) },
  { additionalProperties: false },
);

export const AccountTypeRelationsInputCreate = t.Object(
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
    accounts: t.Optional(
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

export const AccountTypeRelationsInputUpdate = t.Partial(
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
      accounts: t.Partial(
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

export const AccountTypeWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          userId: t.String(),
          name: t.String(),
          color: t.String(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "AccountType" },
  ),
);

export const AccountTypeWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              userId_name: t.Object(
                { userId: t.String(), name: t.String() },
                { additionalProperties: false },
              ),
            },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [
            t.Object({ id: t.String() }),
            t.Object({
              userId_name: t.Object(
                { userId: t.String(), name: t.String() },
                { additionalProperties: false },
              ),
            }),
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
              name: t.String(),
              color: t.String(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "AccountType" },
);

export const AccountTypeSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      userId: t.Boolean(),
      name: t.Boolean(),
      color: t.Boolean(),
      createdAt: t.Boolean(),
      user: t.Boolean(),
      accounts: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const AccountTypeInclude = t.Partial(
  t.Object(
    { user: t.Boolean(), accounts: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const AccountTypeOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      userId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      name: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      color: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const AccountType = t.Composite(
  [AccountTypePlain, AccountTypeRelations],
  { additionalProperties: false },
);

export const AccountTypeInputCreate = t.Composite(
  [AccountTypePlainInputCreate, AccountTypeRelationsInputCreate],
  { additionalProperties: false },
);

export const AccountTypeInputUpdate = t.Composite(
  [AccountTypePlainInputUpdate, AccountTypeRelationsInputUpdate],
  { additionalProperties: false },
);
