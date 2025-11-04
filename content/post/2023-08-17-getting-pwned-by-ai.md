---
layout: post
title: "Getting pwn'd by AI: Penetration Testing with Large Language Models"
categories: ["Papers"]
date: 2023-08-17
---

**Presented at FSE'23 in San Francisco, US**, [arxiv version](https://arxiv.org/abs/2308.00121):

> The field of software security testing, more specifically penetration testing, is an activity that requires high levels of expertise and involves many manual testing and analysis steps. This paper explores the potential usage of large-language models, such as GPT3.5, to augment penetration testers with AI sparring partners. We explore the feasibility of supplementing penetration testers with AI models for two distinct use cases: high-level task planning for security testing assignments and low-level vulnerability hunting within a vulnerable virtual machine. For the latter, we implemented a closed-feedback loop between LLM-generated low-level actions with a vulnerable virtual machine (connected through SSH) and allowed the LLM to analyze the machine state for vulnerabilities and suggest concrete attack vectors which were automatically executed within the virtual machine. We discuss promising initial results, detail avenues for improvement, and close deliberating on the ethics of providing AI-based sparring partners.