import { expect } from "@playwright/test";
import formTest from "@/../test/fixtures/form.fixture";

const test = formTest({
  repo: "ethereumclassic.github.io",
  contribution: "link",
  footer:
    "\n\n---\n*Created using the [ETC Contribunator Bot](https://github.com/ethereumclassic/Contribunator)*",
});

test("link submits basic", async ({ f }) => {
  await f.cannotSubmit([
    "Category is a required field",
    "Service Name is a required field",
    "Service URL is a required field",
  ]);

  await f.clickButton("Category", "No Selection");
  await f.clickButton("Category", "Wallet");
  await f.clickButton("Category", "Web Wallet");

  await f.setText("Service Name", "My Test Link");
  await f.setText("Service Homepage or URL", "https://example.link");

  expect(await f.submit()).toMatchObject({
    req: {
      category: "wallets.web",
      contribution: "link",
      url: "https://example.link",
      name: "My Test Link",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-service-link-my-test-link",
        changes: [
          {
            files: {
              "content/services/wallets/index.yaml": `items:
  web:
    items:
      Existing Test:
        __name: Existing Test
        __link: https://example.com
      My Test Link:
        __name: My Test Link
        __link: https://example.link
  browsers:
    items:
      Existing Test:
        __name: Existing Test
        __link: https://example.com
`,
            },
            message: "Add Service Link: My Test Link",
          },
        ],
      },
      pr: {
        body: `This PR adds a new Service Link:

## Category
Web Wallet

## Service Name
My Test Link

## Service Homepage or URL
https://example.link${f.FOOTER}`,
        head: "c11r/timestamp-add-service-link-my-test-link",
        title: "Add Service Link: My Test Link",
      },
    },
  });
});

test("link is ordered, has icons", async ({ f }) => {
  await f.clickButton("Category", "No Selection");
  await f.clickButton("Category", "Social Channels");
  await f.clickButton("Category", "Telegram Group");

  await f.setText("Service Name", "A Test Link");
  await f.setText("Service Homepage or URL", "https://example.link");

  await f.getByLabel("Icon").locator(".btn-group > a:nth-child(3)").click();

  const { req, res } = await f.submit();

  expect(req.icon).toEqual("twitter");

  expect(res).toMatchObject({
    commit: {
      changes: [
        {
          files: {
            "content/community/channels/index.yaml": `items:
  Chat Rooms:
    items:
      Existing Test:
        __name: Existing Test
        __link: https://example.com
  Development Chat:
    items:
      Existing Test:
        __name: Existing Test
        __link: https://example.com
  Telegram Groups:
    items:
      A Test Link:
        __name: A Test Link
        __link: https://example.link
        __icon: twitter
      Existing Test:
        __name: Existing Test
        __link: https://example.com
`,
          },
        },
      ],
    },
  });
});

test("link contains description", async ({ f }) => {
  await f.clickButton("Category", "No Selection");
  await f.clickButton("Category", "Mining & Development");
  await f.clickButton("Category", "Git Repository");

  await f.cannotSubmit(["Description is a required field"]);

  const multiline = "A multine\n\ndescription";

  await f.setText("Service Name", "Another Test");
  await f.setText("Service Homepage or URL", "https://example.link");
  await f.setText("Description", multiline);

  const { req, res } = await f.submit();

  expect(req.description).toEqual(multiline);

  expect(res).toMatchObject({
    commit: {
      changes: [
        {
          files: {
            "content/development/repositories/index.yaml": `items:
  repos:
    items:
      Another Test:
        __name: Another Test
        __link: https://example.link
        description: |-
          A multine

          description
      Existing Test:
        __name: Existing Test
        __link: https://example.com
`,
          },
        },
      ],
    },
  });
});

test("link contains RPC url", async ({ f }) => {
  await f.clickButton("Category", "No Selection");
  await f.clickButton("Category", "Mining & Development");
  await f.clickButton("Category", "RPC Endpoint");

  await f.cannotSubmit(["URL is required"]);

  await f.setText("Service Name", "Another Test");
  await f.setText("Homepage URL", "https://example.link");
  await f.setText("JSON RPC API URL", "https://example.link/rpc");

  expect(await f.submit()).toMatchObject({
    req: {
      name: "Another Test",
      category: "dev.endpoint",
      contribution: "link",
      url: "https://example.link",
      link2: "https://example.link/rpc",
    },
    res: {
      commit: {
        base: "main",
        branch: "c11r/timestamp-add-service-link-another-test",
        changes: [
          {
            files: {
              "content/network/endpoints/index.yaml": `items:
  endpoints:
    items:
      Another Test:
        __name: Another Test
        __link: https://example.link
        __rpcUrl: https://example.link/rpc
      ETC Cooperative:
        __rpcUrl: https://etc.rivet.link
        __link: https://rivet.link
        __name: ETC Cooperative
`,
            },
            message: "Add Service Link: Another Test",
          },
        ],
        createBranch: true,
        owner: "ethereumclassic",
        repo: "ethereumclassic.github.io",
      },
      pr: {
        base: "main",
        body: `This PR adds a new Service Link:

## Category
RPC Endpoint

## Service Name
Another Test

## Homepage URL
https://example.link

## JSON RPC API URL
https://example.link/rpc${f.FOOTER}`,
      },
    },
  });
});

test("link contains explorer urls", async ({ f }) => {
  await f.clickButton("Category", "No Selection");
  await f.clickButton("Category", "Mining & Development");
  await f.clickButton("Category", "Blockchain Explorer");

  await f.setText("Service Name", "Another Test");
  await f.setText("Mainnet URL", "https://mainnet.link");
  await f.setText("Kotti URL", "https://kotti.link");
  await f.setText("Mordor URL", "https://mordor.link");

  expect(await f.submit()).toMatchObject({
    req: {
      category: "dev.explorers",
      contribution: "link",
      name: "Another Test",
      url: "https://mainnet.link",
      link2: "https://kotti.link",
      link3: "https://mordor.link",
    },

    res: {
      commit: {
        base: "main",
        branch: "c11r/timestamp-add-service-link-another-test",
        changes: [
          {
            files: {
              "content/network/explorers/index.yaml": `items:
  explorers:
    items:
      Another Test:
        __name: Another Test
        __etc: https://mainnet.link
        __kotti: https://kotti.link
        __mordor: https://mordor.link
      BlockScout:
        __name: BlockScout
        __etc: https://blockscout.com/etc/mainnet/
        __kotti: https://blockscout.com/etc/kotti/
        __mordor: https://blockscout.com/etc/mordor/
`,
            },
            message: "Add Service Link: Another Test",
          },
        ],
        createBranch: true,
        owner: "ethereumclassic",
        repo: "ethereumclassic.github.io",
      },
      pr: {
        base: "main",
        body: `This PR adds a new Service Link:

## Category
Blockchain Explorer

## Service Name
Another Test

## Mainnet URL
https://mainnet.link

## Kotti URL
https://kotti.link

## Mordor URL
https://mordor.link${f.FOOTER}`,
      },
    },
  });
});
