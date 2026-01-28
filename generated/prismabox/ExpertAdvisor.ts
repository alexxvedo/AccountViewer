import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const ExpertAdvisorPlain = t.Object(
  {
    id: t.String(),
    accountId: t.String(),
    name: t.String(),
    magicNumber: t.Integer(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  },
  { additionalProperties: false },
);

export const ExpertAdvisorRelations = t.Object(
  {
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

export const ExpertAdvisorPlainInputCreate = t.Object(
  { name: t.String(), magicNumber: t.Integer() },
  { additionalProperties: false },
);

export const ExpertAdvisorPlainInputUpdate = t.Object(
  { name: t.Optional(t.String()), magicNumber: t.Optional(t.Integer()) },
  { additionalProperties: false },
);

export const ExpertAdvisorRelationsInputCreate = t.Object(
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

export const ExpertAdvisorRelationsInputUpdate = t.Partial(
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

export const ExpertAdvisorWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          accountId: t.String(),
          name: t.String(),
          magicNumber: t.Integer(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "ExpertAdvisor" },
  ),
);

export const ExpertAdvisorWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              accountId_magicNumber: t.Object(
                { accountId: t.String(), magicNumber: t.Integer() },
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
              accountId_magicNumber: t.Object(
                { accountId: t.String(), magicNumber: t.Integer() },
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
              accountId: t.String(),
              name: t.String(),
              magicNumber: t.Integer(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "ExpertAdvisor" },
);

export const ExpertAdvisorSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      accountId: t.Boolean(),
      name: t.Boolean(),
      magicNumber: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      account: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const ExpertAdvisorInclude = t.Partial(
  t.Object(
    { account: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const ExpertAdvisorOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      accountId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      name: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      magicNumber: t.Union([t.Literal("asc"), t.Literal("desc")], {
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

export const ExpertAdvisor = t.Composite(
  [ExpertAdvisorPlain, ExpertAdvisorRelations],
  { additionalProperties: false },
);

export const ExpertAdvisorInputCreate = t.Composite(
  [ExpertAdvisorPlainInputCreate, ExpertAdvisorRelationsInputCreate],
  { additionalProperties: false },
);

export const ExpertAdvisorInputUpdate = t.Composite(
  [ExpertAdvisorPlainInputUpdate, ExpertAdvisorRelationsInputUpdate],
  { additionalProperties: false },
);
