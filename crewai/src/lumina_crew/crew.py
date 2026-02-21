"""
Lumina Prompt Engine Crew.

One agent (orchestrator) with one tool (lumina_pipeline). The task is to call the tool
with kickoff inputs and return the tool result as the crew output (FinalResponse JSON).
"""

from typing import List

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent

from lumina_crew.tools import LuminaPipelineTool


@CrewBase
class LuminaCrew:
    """Lumina Prompt Engine crew: runs pipeline and returns FinalResponse JSON."""

    agents: List[BaseAgent]
    tasks: List[Task]

    @agent
    def orchestrator(self) -> Agent:
        return Agent(
            config=self.agents_config["orchestrator"],
            verbose=True,
            tools=[LuminaPipelineTool()],
        )

    @task
    def run_pipeline_task(self) -> Task:
        return Task(
            config=self.tasks_config["run_pipeline_task"],
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
