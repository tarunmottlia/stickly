---
layout: default
title: "Before you reward a user action: a platform-rules lookup for in-app credits"
description: "Which user actions a SaaS can reward with its own product credits, and which ones a platform's written rules forbid: reviews, ratings, follows, joins, stars and upvotes."
---

# Before you reward a user action: a platform-rules lookup for in-app credits

*By Tarun Kumar · 16 November 2026*

Giving your users product credits for doing something useful is a normal growth move: finish onboarding, invite a teammate, try a feature, leave feedback. The trouble starts when the action happens on someone else's platform. A review, a rating, a follow, a server join or an upvote lives under that platform's rules, and many of those rules say in writing that you may not pay for it, and product credits count as payment.

This file is a lookup table to check before you put a third-party action into a rewards list, a referral program or an onboarding checklist. Every row quotes the platform's own published rule. The rules were read logged out on 13 November 2026; policies change, so open the linked page again before you ship.

## How to use it
1. Write down the exact action you want to reward ("leave a review on X", "join our Y community").
2. Find the platform below. If it is under **Do not reward**, drop the action or keep it as a plain, unrewarded ask.
3. If it is under **Allowed with conditions**, copy the conditions into your task text.
4. If the platform is not listed, read its terms for the words "incentive", "incentivized", "reward", "compensate" or "inauthentic" before you build anything.

## Do not reward: the written rule forbids it

| Platform and action | What the rule says | Source |
|---|---|---|
| Google Maps reviews | Merchants may not "Offer incentives – such as payment, discounts, free goods and/or services - in exchange for posting any review" | support.google.com/contributionpolicy/answer/7400114 |
| Google Play ratings and reviews | "Don't offer rewards or incentives for ratings or reviews." | support.google.com/googleplay/android-developer/answer/9898684 |
| Apple App Store ratings and reviews | Apple acts if you "inflate your chart rankings with paid, incentivized, filtered, or fake feedback" | developer.apple.com/app-store/review/guidelines/ (section 3) |
| Chrome Web Store reviews | Bans inflating ratings "by illegitimate means such as fraudulent or incentivized downloads, reviews and ratings" | developer.chrome.com/docs/webstore/program-policies/spam-and-abuse |
| Trustpilot reviews | "We don’t allow incentivized reviews on Trustpilot." | corporate.trustpilot.com/legal/for-businesses/guidelines-for-businesses |
| Product Hunt upvotes | "...incentivizing upvotes, and any other form of artificially increasing activity on your contribution is not acceptable." | help.producthunt.com (Community Guidelines) |
| GitHub stars, follows and other activity | Activity "incentivized by (or incentivizes inauthentic engagement with) rewards such as cryptocurrency airdrops, tokens, credits, gifts or other give-aways" | docs.github.com GitHub Acceptable Use Policies |
| Discord server joins | Lists "artificially inflating server membership (for example, via “join-for-join,” “invite rewards,” purchasing fake members)" | discord.com/safety/platform-manipulation-policy-explainer |
| Instagram and Facebook follows, likes | "Offering to provide anything of monetary value in exchange for engagement." | transparency.meta.com/policies/community-standards/spam/ |
| X follows, likes, reposts | Not allowed: "coordinating with and/or compensating others to conduct account metric inflation" in features including Likes, Reposts and Follows | help.x.com/en/rules-and-policies/authenticity |
| LinkedIn engagement | "Don't do things to artificially increase engagement with your content." | linkedin.com/legal/professional-community-policies |
| YouTube views, likes, comments | "...content that solely exists to incentivize viewers for engagement (views, likes, comments, etc) is prohibited." | support.google.com/youtube/answer/3399767 |
| TikTok follows, likes | Not allowed: "Buying or selling followers or engagement for financial gain" | TikTok Community Guidelines, Integrity and Authenticity |
| Reddit joins and posts | "Participate authentically in communities where you have a personal interest..." (rule 2) | redditinc.com/policies/reddit-rules |

LinkedIn and Reddit do not name rewards word for word; a credit paid per follow, join or post is read here as the artificial or non-authentic participation those rules describe.

## Allowed with conditions

**G2 reviews (this also covers Capterra, Software Advice and GetApp).** G2's community guidelines allow an incentive for a review but cap it: "G2 limits the value of any incentive offered in exchange for a review to $100 USD", and the cap covers "non-cash items such as swag, tokens, credits, and subscriptions". Businesses may not be "conditioning incentives on reviews being positive" or "independently incentivizing reviewers without disclosing those incentives to G2". Since 4 November 2026 one review submitted through the unified flow "counts toward the product’s review count and ratings on every marketplace where that product is listed", so do not create a separate "review us on Capterra" task. Task text to copy: *"Write an honest review on G2. You get the credits whatever you rate us. This reward is disclosed to G2."*

**Joins of your own Slack, Telegram or WhatsApp community.** The published terms read for this (Salesforce/Slack acceptable use policy, telegram.org/tos, WhatsApp terms and Channels Guidelines) contain no written ban on rewarding a join. That is weaker than an explicit permission. Pay the reward you promise: Telegram's terms say channels that "mislead users into joining by means of giveaways that are later refunded" may be labelled as scams.

**Stars on your own GitLab project.** GitLab's acceptable use policy has no line on rewards, but it keeps the right to act on use that "goes against the spirit of this policy, even if that use is not expressly forbidden." Treat it as the weakest row here.

## Actions that need no platform check
These happen inside your own product, so only your own terms apply:
- complete an onboarding step or connect an integration
- invite a teammate or a friend
- try a feature for the first time
- answer a short feedback survey (reward the answer, not a positive score)
- visit a page you choose (a custom link: docs, changelog, pricing)

## A short checklist before you ship a rewarded task
- [ ] The action is in your product, or the platform's written rule allows rewarding it.
- [ ] The reward does not depend on the user saying something positive.
- [ ] Any disclosure the platform asks for is in the task text.
- [ ] The reward is actually paid when the task is claimed, and never taken back later.
- [ ] You re-read the platform's rule page within the last month.

We built Stickly, an in-app engagement widget where SaaS founders choose the actions and the reward is paid in their own product credits through a signed webhook, and this table is what we check before adding a task template: https://stickly.live/?utm_source=github&utm_medium=guest&utm_campaign=gp

I'm Tarun, founder of Stickly.
